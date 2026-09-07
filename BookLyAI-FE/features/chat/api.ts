import { api } from "@/lib/api";
import type { AppointmentDetail } from "@/features/appointments/api";

export interface ChatMessageDto {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  metadata: ChatMessageMeta | null;
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
      draft: {
        businessId: string | null;
        serviceId: string | null;
        serviceName: string | null;
        date: string | null;
        time: string | null;
        awaitingConfirmation: boolean;
      };
    }
  | { type: "appointment"; appointment: AppointmentDetail }
  | { type: "appointment_list"; appointments: AppointmentDetail[] }
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

export interface ChatTurnResult {
  sessionId: string;
  userMessage: ChatMessageDto;
  assistantMessage: ChatMessageDto;
}

export function createChatSession(title?: string) {
  return api<{ session: { id: string; title: string | null; createdAt: string } }>(
    "/api/chat/sessions",
    { method: "POST", body: title ? { title } : {} },
  );
}

export function listChatMessages(sessionId: string) {
  return api<{ sessionId: string; messages: ChatMessageDto[] }>(
    `/api/chat/sessions/${sessionId}/messages`,
  );
}

export function sendChatMessage(input: { sessionId?: string; message: string }) {
  return api<ChatTurnResult>("/api/chat/messages", {
    method: "POST",
    body: input,
  });
}

export function bookFromFallbackForm(input: {
  sessionId?: string;
  businessId: string;
  serviceId: string;
  date: string;
  time: string;
  notes?: string;
}) {
  return api<ChatTurnResult>("/api/chat/book", {
    method: "POST",
    body: input,
  });
}
