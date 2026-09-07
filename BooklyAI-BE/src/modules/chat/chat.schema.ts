import { z } from "zod";

export const chatMessageSchema = z.object({
  sessionId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(2000),
});

export const createSessionSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
});

export const sessionIdParamSchema = z.object({
  id: z.string().uuid(),
});

/** Structured fallback form when the assistant cannot finish a booking confidently. */
export const fallbackBookSchema = z.object({
  sessionId: z.string().uuid().optional(),
  businessId: z.string().uuid(),
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().trim().max(500).optional(),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type FallbackBookInput = z.infer<typeof fallbackBookSchema>;
