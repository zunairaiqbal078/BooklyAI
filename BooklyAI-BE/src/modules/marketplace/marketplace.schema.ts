import { z } from "zod";
import { BUSINESS_CATEGORIES } from "../businesses/business.schema.js";

export const marketplaceListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.enum(BUSINESS_CATEGORIES).optional(),
  city: z.string().trim().max(80).optional(),
});

export const marketplaceSlugParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export type MarketplaceListQuery = z.infer<typeof marketplaceListQuerySchema>;
