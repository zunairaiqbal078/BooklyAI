import { prisma } from "../../config/database.js";
import type { AuthUser } from "../../types/index.js";
import { ForbiddenError, ValidationError } from "../../utils/app-error.js";
import { addMinutes, combineDateAndTimeUtc } from "../../utils/time.js";
import type { AppointmentDto } from "../appointments/appointment.service.js";
import type { CalendarQuery } from "./calendar.schema.js";

type CalendarAppointmentRow = {
  id: string;
  businessId: string;
  customerId: string;
  serviceId: string;
  startTime: Date;
  endTime: Date;
  status: AppointmentDto["status"];
  notes: string | null;
  reviewRequested: boolean;
  createdAt: Date;
  business: { id: string; name: string; slug: string };
  service: { id: string; name: string; durationMin: number; priceCents: number | null };
  customer: { id: string; name: string; email: string };
  review: { id: string } | null;
};

/**
 * Role-aware calendar:
 * - business owners see appointments for their business
 * - customers see their own appointments
 * Overlaps are rejected in AppointmentService.
 */
export class CalendarService {
  async getRange(
    actor: AuthUser,
    query: CalendarQuery,
  ): Promise<{ from: string; to: string; appointments: AppointmentDto[] }> {
    const from = combineDateAndTimeUtc(query.from, "00:00");
    const toExclusive = addMinutes(combineDateAndTimeUtc(query.to, "00:00"), 24 * 60);

    if (from >= toExclusive) {
      throw new ValidationError("`from` must be on or before `to`.");
    }

    if (actor.role === "BUSINESS" && !actor.businessId) {
      throw new ForbiddenError("Business profile is incomplete.");
    }

    const where =
      actor.role === "CUSTOMER"
        ? {
            customerId: actor.id,
            startTime: { lt: toExclusive },
            endTime: { gt: from },
          }
        : {
            businessId: actor.businessId!,
            startTime: { lt: toExclusive },
            endTime: { gt: from },
          };

    const rows = (await prisma.appointment.findMany({
      where,
      include: {
        business: { select: { id: true, name: true, slug: true } },
        service: { select: { id: true, name: true, durationMin: true, priceCents: true } },
        customer: { select: { id: true, name: true, email: true } },
        review: { select: { id: true } },
      },
      orderBy: { startTime: "asc" },
    })) as CalendarAppointmentRow[];

    const appointments: AppointmentDto[] = rows.map((row: CalendarAppointmentRow) => ({
      id: row.id,
      businessId: row.businessId,
      businessName: row.business.name,
      businessSlug: row.business.slug,
      customerId: row.customerId,
      customerName: row.customer.name,
      customerEmail: row.customer.email,
      serviceId: row.serviceId,
      service: row.service.name,
      durationMin: row.service.durationMin,
      priceCents: row.service.priceCents,
      startTime: row.startTime.toISOString(),
      endTime: row.endTime.toISOString(),
      status: row.status,
      notes: row.notes,
      reviewRequested: row.reviewRequested,
      hasReview: Boolean(row.review),
      createdAt: row.createdAt.toISOString(),
    }));

    return { from: query.from, to: query.to, appointments };
  }
}

export const calendarService = new CalendarService();
