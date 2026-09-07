import { z } from "zod";

export const calendarQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type CalendarQuery = z.infer<typeof calendarQuerySchema>;
