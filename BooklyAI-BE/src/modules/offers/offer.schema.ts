import { z } from "zod";

export const createOfferSchema = z.object({
  serviceId: z.string().uuid(),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  priceCents: z.number().int().min(0).max(1_000_000).nullable().optional(),
  imageUrl: z.string().url().max(500).optional(),
});

export const updateOfferSchema = createOfferSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const offerIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type UpdateOfferInput = z.infer<typeof updateOfferSchema>;
