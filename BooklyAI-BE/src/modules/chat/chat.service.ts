import type { ChatRole, Prisma } from "@prisma/client";
import { aiService } from "../../ai/ai.service.js";
import type { AiIntent, BookingDraft } from "../../ai/ai.schema.js";
import { prisma } from "../../config/database.js";
import { logger } from "../../config/logger.js";
import type { AuthUser } from "../../types/index.js";
import { ForbiddenError, NotFoundError, ValidationError } from "../../utils/app-error.js";
import { combineDateAndTimeUtc } from "../../utils/time.js";
import {
  appointmentService,
  type AppointmentDto,
} from "../appointments/appointment.service.js";
import { availabilityService } from "../availability/availability.service.js";
import type { ChatMessageInput, FallbackBookInput } from "./chat.schema.js";

const HISTORY_LIMIT = 12;

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export type ChatMessageMeta =
  | { type: "text" }
  | {
      type: "slots";
      date: string;
      businessId: string;
      serviceId: string | null;
      slots: string[];
    }
  | {
      type: "confirmation";
      draft: BookingDraft;
    }
  | {
      type: "appointment";
      appointment: AppointmentDto;
    }
  | {
      type: "appointment_list";
      appointments: AppointmentDto[];
    }
  | {
      type: "fallback_form";
      form: {
        businessId: string;
        serviceId: string | null;
        serviceName: string | null;
        date: string | null;
        time: string | null;
        missingFields: string[];
        availableSlots?: string[];
      };
    };

export interface ChatMessageDto {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  metadata: ChatMessageMeta | null;
}

export interface ChatTurnResult {
  sessionId: string;
  userMessage: ChatMessageDto;
  assistantMessage: ChatMessageDto;
  draft: BookingDraft | null;
}

function toMessageDto(row: {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: Date;
  metadata: Prisma.JsonValue | null;
}): ChatMessageDto {
  return {
    id: row.id,
    role: row.role === "USER" ? "user" : row.role === "ASSISTANT" ? "assistant" : "system",
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    metadata: (row.metadata as ChatMessageMeta | null) ?? null,
  };
}

function emptyDraft(): BookingDraft {
  return {
    businessId: null,
    serviceId: null,
    serviceName: null,
    date: null,
    time: null,
    awaitingConfirmation: false,
  };
}

function readDraft(metadata: Prisma.JsonValue | null): BookingDraft {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return emptyDraft();
  }
  const draft = (metadata as { draft?: BookingDraft }).draft;
  return draft ? { ...emptyDraft(), ...draft } : emptyDraft();
}

/**
 * Orchestrates conversation memory, AI interpretation, then appointment/availability services.
 * The LLM never writes to the database.
 */
export class ChatService {
  async createSession(user: AuthUser, title?: string) {
    const session = await prisma.chatSession.create({
      data: {
        userId: user.id,
        title: title ?? "New conversation",
        metadata: asJson({ draft: emptyDraft() }),
      },
    });
    return {
      id: session.id,
      title: session.title,
      createdAt: session.createdAt.toISOString(),
    };
  }

  async listMessages(user: AuthUser, sessionId: string): Promise<ChatMessageDto[]> {
    const session = await this.requireSession(user, sessionId);
    const rows = await prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toMessageDto);
  }

  async sendMessage(user: AuthUser, input: ChatMessageInput): Promise<ChatTurnResult> {
    if (user.role !== "CUSTOMER") {
      throw new ForbiddenError("The booking assistant is available to customers.");
    }

    const session = input.sessionId
      ? await this.requireSession(user, input.sessionId)
      : await prisma.chatSession.create({
          data: {
            userId: user.id,
            title: input.message.slice(0, 60),
            metadata: asJson({ draft: emptyDraft() }),
          },
        });

    const userMessage = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "USER",
        content: input.message,
      },
    });

    const historyRows = await prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "desc" },
      take: HISTORY_LIMIT,
    });
    const history = historyRows
      .reverse()
      .filter((row) => row.id !== userMessage.id)
      .map((row) => ({
        role: (row.role === "USER" ? "user" : "assistant") as "user" | "assistant",
        content: row.content,
      }));

    const [businesses, services] = await Promise.all([
      prisma.business.findMany({
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
      }),
      prisma.service.findMany({
        where: { isActive: true },
        select: { id: true, businessId: true, name: true, durationMin: true },
        orderBy: { name: "asc" },
      }),
    ]);

    let draft = readDraft(session.metadata);
    const today = new Date().toISOString().slice(0, 10);

    const aiResult = await aiService.interpret({
      message: input.message,
      history,
      context: {
        today,
        businesses,
        services,
        draft,
      },
    });

    await prisma.aiInteraction.create({
      data: {
        userId: user.id,
        sessionId: session.id,
        model: aiResult.model,
        intent: aiResult.intent.intent,
        success: aiResult.success,
        latencyMs: aiResult.latencyMs,
        errorCode: aiResult.errorCode,
        metadata: asJson({
          source: aiResult.source,
          confidence: aiResult.intent.confidence,
          missingFields: aiResult.intent.missingFields,
        }),
      },
    });

    logger.info(
      {
        event: "ai.request",
        sessionId: session.id,
        intent: aiResult.intent.intent,
        success: aiResult.success,
        source: aiResult.source,
        latencyMs: aiResult.latencyMs,
      },
      "AI interpret completed",
    );

    draft = this.mergeDraft(draft, aiResult.intent, services, businesses);
    const outcome = await this.executeIntent({
      user,
      intent: aiResult.intent,
      draft,
      services,
    });

    draft = outcome.draft;

    const assistantMessage = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "ASSISTANT",
        content: outcome.reply,
        metadata: asJson(outcome.metadata),
      },
    });

    await prisma.chatSession.update({
      where: { id: session.id },
      data: {
        metadata: asJson({ draft }),
        title: session.title ?? input.message.slice(0, 60),
      },
    });

    return {
      sessionId: session.id,
      userMessage: toMessageDto(userMessage),
      assistantMessage: toMessageDto(assistantMessage),
      draft,
    };
  }

  async bookFromForm(user: AuthUser, input: FallbackBookInput): Promise<ChatTurnResult> {
    if (user.role !== "CUSTOMER") {
      throw new ForbiddenError("Only customers can book appointments.");
    }

    const startTime = combineDateAndTimeUtc(input.date, input.time).toISOString();
    const appointment = await appointmentService.create(user, {
      businessId: input.businessId,
      serviceId: input.serviceId,
      startTime,
      notes: input.notes,
    });

    const session = input.sessionId
      ? await this.requireSession(user, input.sessionId)
      : await prisma.chatSession.create({
          data: {
            userId: user.id,
            title: "Booked via form",
            metadata: asJson({ draft: emptyDraft() }),
          },
        });

    const userMessage = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "USER",
        content: `Book ${appointment.service} on ${input.date} at ${input.time}`,
        metadata: asJson({ type: "fallback_form" }),
      },
    });

    const reply = `Your appointment is confirmed for ${appointment.service} on ${input.date} at ${input.time}.`;
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "ASSISTANT",
        content: reply,
        metadata: asJson({ type: "appointment", appointment }),
      },
    });

    await prisma.chatSession.update({
      where: { id: session.id },
      data: { metadata: asJson({ draft: emptyDraft() }) },
    });

    return {
      sessionId: session.id,
      userMessage: toMessageDto(userMessage),
      assistantMessage: toMessageDto(assistantMessage),
      draft: emptyDraft(),
    };
  }

  private async requireSession(user: AuthUser, sessionId: string) {
    const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      throw new NotFoundError("Chat session not found.");
    }
    if (session.userId !== user.id) {
      throw new ForbiddenError("You do not have access to this conversation.");
    }
    return session;
  }

  private mergeDraft(
    draft: BookingDraft,
    intent: AiIntent,
    services: Array<{ id: string; businessId: string; name: string }>,
    businesses: Array<{ id: string }>,
  ): BookingDraft {
    const next: BookingDraft = { ...draft };

    if (intent.businessId) {
      next.businessId = intent.businessId;
    } else if (!next.businessId && businesses[0]) {
      next.businessId = businesses[0].id;
    }

    if (intent.service) {
      const matched = services.find(
        (service) => service.name.toLowerCase() === intent.service!.toLowerCase(),
      ) ?? services.find((service) =>
        service.name.toLowerCase().includes(intent.service!.toLowerCase()),
      );
      if (matched) {
        next.serviceId = matched.id;
        next.serviceName = matched.name;
        next.businessId = matched.businessId;
      } else {
        next.serviceName = intent.service;
      }
    }

    if (intent.date) next.date = intent.date;
    if (intent.time) next.time = intent.time;

    if (intent.intent === "confirm_booking") {
      next.awaitingConfirmation = true;
    }

    return next;
  }

  private async executeIntent(params: {
    user: AuthUser;
    intent: AiIntent;
    draft: BookingDraft;
    services: Array<{ id: string; businessId: string; name: string; durationMin: number }>;
  }): Promise<{ reply: string; metadata: ChatMessageMeta; draft: BookingDraft }> {
    const { user, intent } = params;
    let draft = params.draft;

    if (intent.intent === "list_appointments") {
      const appointments = await appointmentService.list(user, { status: "CONFIRMED" });
      const upcoming = appointments.filter(
        (appt) => new Date(appt.startTime).getTime() >= Date.now(),
      );
      return {
        reply:
          upcoming.length > 0
            ? `You have ${upcoming.length} upcoming appointment${upcoming.length === 1 ? "" : "s"}.`
            : "You don't have any upcoming appointments.",
        metadata: { type: "appointment_list", appointments: upcoming },
        draft,
      };
    }

    if (intent.intent === "confirm_booking" || (intent.confirm && this.isDraftComplete(draft))) {
      return this.confirmDraft(user, draft);
    }

    if (
      intent.intent === "book_appointment" ||
      intent.intent === "check_availability"
    ) {
      return this.handleBookingFlow(user, intent, draft);
    }

    if (intent.intent === "cancel_appointment") {
      return {
        reply: intent.reply,
        metadata: { type: "text" },
        draft,
      };
    }

    // Low confidence / incomplete → offer fallback form
    if (intent.confidence < 0.55 || intent.intent === "unknown") {
      return this.fallbackFormResponse(draft, intent);
    }

    return {
      reply: intent.reply,
      metadata: { type: "text" },
      draft,
    };
  }

  private async handleBookingFlow(
    _user: AuthUser,
    intent: AiIntent,
    draft: BookingDraft,
  ): Promise<{ reply: string; metadata: ChatMessageMeta; draft: BookingDraft }> {
    if (!draft.businessId) {
      return this.fallbackFormResponse(draft, intent);
    }

    if (!draft.serviceId || !draft.date) {
      const missing = [
        ...(!draft.serviceId ? ["service"] : []),
        ...(!draft.date ? ["date"] : []),
        ...(!draft.time ? ["time"] : []),
      ];
      if (missing.length > 0 && intent.confidence < 0.8) {
        return this.fallbackFormResponse(draft, {
          ...intent,
          missingFields: missing,
          reply: intent.reply,
        });
      }
      return {
        reply: intent.reply,
        metadata: { type: "text" },
        draft,
      };
    }

    // Have service + date → offer real slots from backend
    const availability = await availabilityService.getSlots({
      businessId: draft.businessId,
      date: draft.date,
      serviceId: draft.serviceId,
    });

    if (!draft.time) {
      if (availability.slots.length === 0) {
        return {
          reply: `I don't have any open times on ${draft.date}. Try another day, or use the form below.`,
          metadata: {
            type: "fallback_form",
            form: {
              businessId: draft.businessId,
              serviceId: draft.serviceId,
              serviceName: draft.serviceName,
              date: draft.date,
              time: null,
              missingFields: ["time"],
              availableSlots: [],
            },
          },
          draft,
        };
      }

      const slotList = availability.slots.slice(0, 5).join(", ");
      draft.awaitingConfirmation = false;
      return {
        reply: `I have ${slotList} available on ${draft.date}. Which time works for you?`,
        metadata: {
          type: "slots",
          date: draft.date,
          businessId: draft.businessId,
          serviceId: draft.serviceId,
          slots: availability.slots,
        },
        draft,
      };
    }

    // Have full draft → ask for confirmation (do not write yet)
    if (!availability.slots.includes(draft.time)) {
      return {
        reply: `${draft.time} isn't open on ${draft.date}. Pick one of these instead: ${availability.slots.slice(0, 5).join(", ") || "no slots left"}.`,
        metadata: {
          type: "slots",
          date: draft.date,
          businessId: draft.businessId,
          serviceId: draft.serviceId,
          slots: availability.slots,
        },
        draft: { ...draft, time: null, awaitingConfirmation: false },
      };
    }

    draft.awaitingConfirmation = true;
    return {
      reply: `Great. Would you like me to confirm your ${draft.serviceName ?? "appointment"} on ${draft.date} at ${draft.time}?`,
      metadata: { type: "confirmation", draft },
      draft,
    };
  }

  private async confirmDraft(
    user: AuthUser,
    draft: BookingDraft,
  ): Promise<{ reply: string; metadata: ChatMessageMeta; draft: BookingDraft }> {
    if (!this.isDraftComplete(draft)) {
      return this.fallbackFormResponse(draft, {
        intent: "book_appointment",
        service: draft.serviceName,
        date: draft.date,
        time: draft.time,
        businessId: draft.businessId,
        confirm: false,
        confidence: 0.6,
        missingFields: [
          ...(!draft.serviceId ? ["service"] : []),
          ...(!draft.date ? ["date"] : []),
          ...(!draft.time ? ["time"] : []),
        ],
        reply: "I still need a few details before I can confirm.",
      });
    }

    try {
      const startTime = combineDateAndTimeUtc(draft.date!, draft.time!).toISOString();
      const appointment = await appointmentService.create(user, {
        businessId: draft.businessId!,
        serviceId: draft.serviceId!,
        startTime,
      });

      return {
        reply: `Your appointment is confirmed for ${appointment.service} on ${draft.date} at ${draft.time}.`,
        metadata: { type: "appointment", appointment },
        draft: emptyDraft(),
      };
    } catch (error) {
      logger.info(
        {
          event: "appointment.conflict",
          err: error instanceof Error ? error.message : "unknown",
        },
        "Chat confirm failed",
      );
      return {
        reply:
          "That slot is no longer available. Please pick another time from the form below.",
        metadata: {
          type: "fallback_form",
          form: {
            businessId: draft.businessId!,
            serviceId: draft.serviceId,
            serviceName: draft.serviceName,
            date: draft.date,
            time: null,
            missingFields: ["time"],
          },
        },
        draft: { ...draft, time: null, awaitingConfirmation: false },
      };
    }
  }

  private fallbackFormResponse(
    draft: BookingDraft,
    intent: AiIntent,
  ): { reply: string; metadata: ChatMessageMeta; draft: BookingDraft } {
    if (!draft.businessId) {
      throw new ValidationError("No bookable business is configured yet.");
    }

    return {
      reply: `${intent.reply} You can also complete the details in the form below.`,
      metadata: {
        type: "fallback_form",
        form: {
          businessId: draft.businessId,
          serviceId: draft.serviceId,
          serviceName: draft.serviceName,
          date: draft.date,
          time: draft.time,
          missingFields: intent.missingFields,
        },
      },
      draft,
    };
  }

  private isDraftComplete(draft: BookingDraft): boolean {
    return Boolean(draft.businessId && draft.serviceId && draft.date && draft.time);
  }
}

export const chatService = new ChatService();
