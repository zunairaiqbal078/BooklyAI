import { z } from "zod";

export const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  businessId: z.string().uuid(),
  serviceId: z.string().uuid().optional(),
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
