import type { InputJsonValue, JsonValue } from "@prisma/client/runtime/library";
import { aiService } from "../../ai/ai.service.js";
import type { AiCatalogContext, AiIntent, BookingDraft } from "../../ai/ai.schema.js";
import { prisma } from "../../config/database.js";
import { logger } from "../../config/logger.js";
import type { AuthUser } from "../../types/index.js";
import { ForbiddenError, NotFoundError } from "../../utils/app-error.js";
import { combineDateAndTimeUtc } from "../../utils/time.js";
import {
  appointmentService,
  type AppointmentDto,
} from "../appointments/appointment.service.js";
import { availabilityService } from "../availability/availability.service.js";
import type { ChatMessageInput, FallbackBookInput } from "./chat.schema.js";

type ChatRole = "USER" | "ASSISTANT" | "SYSTEM";

const HISTORY_LIMIT = 12;

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function accountInfoReply(account: AiCatalogContext["account"]): string {
  const name = account.name;
  if (account.role === "BUSINESS") {
    const biz = account.ownedBusiness;
    if (!biz) {
      return `${name}, you're signed in as a business owner (${account.email}). Finish onboarding to publish your business profile.`;
    }
    return `${name}, you're signed in as the owner of ${biz.name} (${biz.category}${biz.city ? ` · ${biz.city}` : ""}). Account email: ${account.email}. Published: ${biz.isPublished ? "yes" : "no"}.`;
  }
  return `${name}, you're signed in as a customer. Account email: ${account.email}.`;
}

function asJson(value: unknown): InputJsonValue {
  return value as InputJsonValue;
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
      type: "business_summary";
      summary: {
        total: number;
        upcoming: number;
        today: number;
        pending: number;
        confirmed: number;
        completed: number;
        cancelled: number;
        paidCount: number;
        paidRevenueCents: number;
      };
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
  metadata: JsonValue | null;
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

function readDraft(metadata: JsonValue | null): BookingDraft {
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
    if (user.role !== "CUSTOMER" && user.role !== "BUSINESS") {
      throw new ForbiddenError("Assistant access is not available for this account.");
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
      .filter((row: { id: string }) => row.id !== userMessage.id)
      .map((row: { role: ChatRole; content: string }) => ({
        role: (row.role === "USER" ? "user" : "assistant") as "user" | "assistant",
        content: row.content,
      }));

    const today = new Date().toISOString().slice(0, 10);
    let draft = readDraft(session.metadata);

    let businesses: Array<{
      id: string;
      name: string;
      slug: string;
      category: string;
      city: string | null;
      description: string | null;
    }> = [];
    let services: Array<{
      id: string;
      businessId: string;
      name: string;
      durationMin: number;
      priceCents: number | null;
    }> = [];
    let businessStats: {
      total: number;
      upcoming: number;
      today: number;
      completed: number;
      cancelled: number;
      paidCount: number;
      paidRevenueCents: number;
    } | null = null;

    let ownedBusiness: {
      id: string;
      name: string;
      slug: string;
      category: string;
      city: string | null;
      address: string | null;
      isPublished: boolean;
      onboardingComplete: boolean;
    } | null = null;

    if (user.role === "CUSTOMER") {
      [businesses, services] = await Promise.all([
        prisma.business.findMany({
          where: { isPublished: true, onboardingComplete: true },
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
            city: true,
            description: true,
          },
          orderBy: { name: "asc" },
        }),
        prisma.service.findMany({
          where: {
            isActive: true,
            business: { isPublished: true, onboardingComplete: true },
          },
          select: {
            id: true,
            businessId: true,
            name: true,
            durationMin: true,
            priceCents: true,
          },
          orderBy: { name: "asc" },
        }),
      ]);
    } else {
      const summary = await appointmentService.summarizeForBusiness(user);
      businessStats = {
        total: summary.total,
        upcoming: summary.upcoming,
        today: summary.today,
        completed: summary.completed,
        cancelled: summary.cancelled,
        paidCount: summary.paidCount,
        paidRevenueCents: summary.paidRevenueCents,
      };
      if (user.businessId) {
        const owned = await prisma.business.findUnique({
          where: { id: user.businessId },
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
            city: true,
            address: true,
            description: true,
            isPublished: true,
            onboardingComplete: true,
          },
        });
        if (owned) {
          ownedBusiness = {
            id: owned.id,
            name: owned.name,
            slug: owned.slug,
            category: owned.category,
            city: owned.city,
            address: owned.address,
            isPublished: owned.isPublished,
            onboardingComplete: owned.onboardingComplete,
          };
          businesses = [
            {
              id: owned.id,
              name: owned.name,
              slug: owned.slug,
              category: owned.category,
              city: owned.city,
              description: owned.description,
            },
          ];
        }
        services = await prisma.service.findMany({
          where: { businessId: user.businessId, isActive: true },
          select: {
            id: true,
            businessId: true,
            name: true,
            durationMin: true,
            priceCents: true,
          },
        });
      }
    }

    const account = {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
      onboardingComplete: user.onboardingComplete,
      ownedBusiness,
    };

    const aiResult = await aiService.interpret({
      message: input.message,
      history,
      context: {
        today,
        role: user.role,
        account,
        businesses,
        services,
        draft: user.role === "CUSTOMER" ? draft : null,
        businessStats,
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
          role: user.role,
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
        role: user.role,
      },
      "AI interpret completed",
    );

    let outcome: { reply: string; metadata: ChatMessageMeta; draft: BookingDraft };

    if (user.role === "BUSINESS") {
      outcome = await this.executeBusinessIntent({
        user,
        intent: aiResult.intent,
        account,
      });
      draft = emptyDraft();
    } else {
      draft = this.mergeDraft(draft, aiResult.intent, services, businesses);
      outcome = await this.executeIntent({
        user,
        intent: aiResult.intent,
        draft,
        services,
        account,
      });
      draft = outcome.draft;
    }

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
      draft: user.role === "CUSTOMER" ? draft : emptyDraft(),
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
    } else if (!next.businessId && businesses.length === 1) {
      next.businessId = businesses[0]!.id;
    }

    if (intent.service) {
      const scoped = next.businessId
        ? services.filter((service) => service.businessId === next.businessId)
        : services;
      const matched =
        scoped.find(
          (service) => service.name.toLowerCase() === intent.service!.toLowerCase(),
        ) ??
        scoped.find((service) =>
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

  private async executeBusinessIntent(params: {
    user: AuthUser;
    intent: AiIntent;
    account: AiCatalogContext["account"];
  }): Promise<{ reply: string; metadata: ChatMessageMeta; draft: BookingDraft }> {
    const { user, intent, account } = params;
    const draft = emptyDraft();
    const greet = firstName(account.name);

    if (intent.intent === "out_of_context") {
      return { reply: intent.reply, metadata: { type: "text" }, draft };
    }

    if (intent.intent === "account_info") {
      return {
        reply: accountInfoReply(account),
        metadata: { type: "text" },
        draft,
      };
    }

    if (intent.intent === "list_appointments") {
      const appointments = await appointmentService.list(user, { status: "CONFIRMED" });
      const upcoming = appointments.filter(
        (appt) => new Date(appt.startTime).getTime() >= Date.now(),
      );
      const pending = await appointmentService.list(user, { status: "PENDING" });
      const pendingUpcoming = pending.filter(
        (appt) => new Date(appt.startTime).getTime() >= Date.now(),
      );
      const combined = [...upcoming, ...pendingUpcoming].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );
      const bizLabel = account.ownedBusiness?.name ?? "your business";

      return {
        reply:
          combined.length > 0
            ? `${greet}, ${bizLabel} has ${combined.length} upcoming appointment${combined.length === 1 ? "" : "s"}.`
            : `${greet}, ${bizLabel} has no upcoming appointments right now.`,
        metadata: { type: "appointment_list", appointments: combined },
        draft,
      };
    }

    // Default + business_summary / small_talk / unknown → account summary
    const summary = await appointmentService.summarizeForBusiness(user);
    const revenue =
      summary.paidRevenueCents > 0
        ? ` Completed/paid visits: ${summary.paidCount} (≈ $${(summary.paidRevenueCents / 100).toFixed(0)} from listed prices).`
        : ` Completed/paid visits: ${summary.paidCount}.`;
    const bizLabel = account.ownedBusiness?.name ?? "Your business";

    return {
      reply:
        intent.intent === "business_summary" || intent.confidence >= 0.7
          ? `${greet} — ${bizLabel} summary: ${summary.total} total · ${summary.upcoming} upcoming · ${summary.today} today · ${summary.confirmed} confirmed · ${summary.pending} pending · ${summary.cancelled} cancelled.${revenue}`
          : intent.reply,
      metadata: {
        type: "business_summary",
        summary: {
          total: summary.total,
          upcoming: summary.upcoming,
          today: summary.today,
          pending: summary.pending,
          confirmed: summary.confirmed,
          completed: summary.completed,
          cancelled: summary.cancelled,
          paidCount: summary.paidCount,
          paidRevenueCents: summary.paidRevenueCents,
        },
      },
      draft,
    };
  }

  private async executeIntent(params: {
    user: AuthUser;
    intent: AiIntent;
    draft: BookingDraft;
    services: Array<{ id: string; businessId: string; name: string; durationMin: number }>;
    account: AiCatalogContext["account"];
  }): Promise<{ reply: string; metadata: ChatMessageMeta; draft: BookingDraft }> {
    const { user, intent, account } = params;
    let draft = params.draft;
    const greet = firstName(account.name);

    if (intent.intent === "account_info") {
      return {
        reply: accountInfoReply(account),
        metadata: { type: "text" },
        draft,
      };
    }

    if (intent.intent === "list_appointments") {
      const appointments = await appointmentService.list(user, { status: "CONFIRMED" });
      const upcoming = appointments.filter(
        (appt) => new Date(appt.startTime).getTime() >= Date.now(),
      );
      return {
        reply:
          upcoming.length > 0
            ? `${greet}, you have ${upcoming.length} upcoming appointment${upcoming.length === 1 ? "" : "s"}.`
            : `${greet}, you don't have any upcoming appointments.`,
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

    if (intent.intent === "out_of_context") {
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
      return {
        reply:
          intent.missingFields.includes("business") || !intent.businessId
            ? `${intent.reply} Browse Explore to pick a business by city, or name the salon/clinic you want.`
            : intent.reply,
        metadata: { type: "text" },
        draft,
      };
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
