import { z } from "zod";

export const aiIntentSchema = z.object({
  intent: z.enum([
    "book_appointment",
    "list_appointments",
    "cancel_appointment",
    "check_availability",
    "confirm_booking",
    "business_summary",
    "account_info",
    "out_of_context",
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
  role: "CUSTOMER" | "BUSINESS";
  /** Signed-in user profile — always present during chat. */
  account: {
    userId: string;
    name: string;
    email: string;
    role: "CUSTOMER" | "BUSINESS";
    businessId: string | null;
    onboardingComplete: boolean | null;
    ownedBusiness: {
      id: string;
      name: string;
      slug: string;
      category: string;
      city: string | null;
      address: string | null;
      isPublished: boolean;
      onboardingComplete: boolean;
    } | null;
  };
  businesses: Array<{
    id: string;
    name: string;
    slug: string;
    category: string;
    city: string | null;
    description: string | null;
  }>;
  services: Array<{
    id: string;
    businessId: string;
    name: string;
    durationMin: number;
    priceCents: number | null;
  }>;
  draft: BookingDraft | null;
  /** Precomputed account stats for BUSINESS role (optional). */
  businessStats?: {
    total: number;
    upcoming: number;
    today: number;
    completed: number;
    cancelled: number;
    paidCount: number;
    paidRevenueCents: number;
  } | null;
}

export interface BookingDraft {
  businessId: string | null;
  serviceId: string | null;
  serviceName: string | null;
  date: string | null;
  time: string | null;
  awaitingConfirmation: boolean;
}
