import { z } from "zod";

export const createAppointmentSchema = z.object({
  businessId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startTime: z.string().datetime(),
  notes: z.string().trim().max(500).optional(),
});

export const appointmentIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listAppointmentsQuerySchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]).optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;
