import { z } from "zod";

export const listServicesQuerySchema = z.object({
  businessId: z.string().uuid().optional(),
});

export type ListServicesQuery = z.infer<typeof listServicesQuerySchema>;
