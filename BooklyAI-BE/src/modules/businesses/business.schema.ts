import { z } from "zod";

export const BUSINESS_CATEGORIES = [
  "SALON",
  "CLINIC",
  "SPA",
  "WELLNESS",
  "FITNESS",
  "OTHER",
] as const;

export const businessCategorySchema = z.enum(BUSINESS_CATEGORIES);

export const businessIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const serviceIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const updateMyBusinessSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  category: businessCategorySchema.optional(),
  city: z.string().trim().min(2).max(80).optional(),
  address: z.string().trim().max(200).nullable().optional(),
  coverImageUrl: z.string().url().max(500).nullable().optional(),
  timezone: z.string().trim().min(2).max(64).optional(),
  isPublished: z.boolean().optional(),
});

export const onboardingServiceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  durationMin: z.number().int().min(5).max(480),
  priceCents: z.number().int().min(0).max(1_000_000).nullable().optional(),
  imageUrl: z.string().url().max(500).optional(),
});

export const onboardingHoursSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  slotMin: z.number().int().min(5).max(240).default(30),
});

export const completeOnboardingSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
  category: businessCategorySchema,
  city: z.string().trim().min(2).max(80),
  address: z.string().trim().max(200).optional(),
  timezone: z.string().trim().min(2).max(64).default("UTC"),
  coverImageUrl: z.string().url().max(500).optional(),
  services: z.array(onboardingServiceSchema).max(20).default([]),
  hours: z.array(onboardingHoursSchema).min(1).max(14),
  publish: z.boolean().default(true),
});

export const createServiceSchema = onboardingServiceSchema;
export const updateServiceSchema = onboardingServiceSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const replaceHoursSchema = z.object({
  hours: z.array(onboardingHoursSchema).min(1).max(14),
});

export type UpdateMyBusinessInput = z.infer<typeof updateMyBusinessSchema>;
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type ReplaceHoursInput = z.infer<typeof replaceHoursSchema>;
