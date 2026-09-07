import { z } from "zod";

export const aiIntentSchema = z.object({
  intent: z.enum([
    "book_appointment",
    "list_appointments",
    "cancel_appointment",
    "check_availability",
    "confirm_booking",
    "small_talk",
    "unknown",
  ]),
  service: z.string().nullable(),
  date: z.string().nullable(),
  time: z.string().nullable(),
  businessId: z.string().uuid().nullable(),
  /** True when the user clearly confirms a proposed booking. */
  confirm: z.boolean().default(false),
  confidence: z.number().min(0).max(1),
  missingFields: z.array(z.string()),
  reply: z.string().min(1),
});

export type AiIntent = z.infer<typeof aiIntentSchema>;

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AiCatalogContext {
  today: string;
  businesses: Array<{ id: string; name: string; slug: string }>;
  services: Array<{
    id: string;
    businessId: string;
    name: string;
    durationMin: number;
  }>;
  draft: BookingDraft | null;
}

export interface BookingDraft {
  businessId: string | null;
  serviceId: string | null;
  serviceName: string | null;
  date: string | null;
  time: string | null;
  awaitingConfirmation: boolean;
}
