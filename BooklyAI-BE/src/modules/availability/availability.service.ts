import { AppointmentStatus } from "@prisma/client";
import { prisma } from "../../config/database.js";
import { logger } from "../../config/logger.js";
import { NotFoundError, ValidationError } from "../../utils/app-error.js";
import {
  addMinutes,
  combineDateAndTimeUtc,
  formatTimeUtc,
  minutesToHm,
  parseHmToMinutes,
  rangesOverlap,
  utcDayBounds,
} from "../../utils/time.js";
import type { AvailabilityQuery } from "./availability.schema.js";

const ACTIVE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
];

export interface AvailabilityResult {
  date: string;
  businessId: string;
  serviceId: string | null;
  durationMin: number;
  slots: string[];
}

/**
 * Real availability from weekly rules minus active appointments.
 * The AI must call this — it must never invent times.
 */
export class AvailabilityService {
  async getSlots(query: AvailabilityQuery & { serviceId?: string }): Promise<AvailabilityResult> {
    const business = await prisma.business.findUnique({
      where: { id: query.businessId },
      select: { id: true },
    });

    if (!business) {
      throw new NotFoundError("Business not found.");
    }

    let durationMin = 30;
    let serviceId: string | null = query.serviceId ?? null;

    if (query.serviceId) {
      const service = await prisma.service.findFirst({
        where: {
          id: query.serviceId,
          businessId: query.businessId,
          isActive: true,
        },
      });
      if (!service) {
        throw new NotFoundError("Service not found for this business.");
      }
      durationMin = service.durationMin;
      serviceId = service.id;
    }

    const day = combineDateAndTimeUtc(query.date, "12:00");
    const dayOfWeek = day.getUTCDay();

    const rules = await prisma.availabilityRule.findMany({
      where: { businessId: query.businessId, dayOfWeek },
      orderBy: { startTime: "asc" },
    });

    if (rules.length === 0) {
      return {
        date: query.date,
        businessId: query.businessId,
        serviceId,
        durationMin,
        slots: [],
      };
    }

    const { start: dayStart, end: dayEnd } = utcDayBounds(query.date);

    const booked = await prisma.appointment.findMany({
      where: {
        businessId: query.businessId,
        status: { in: ACTIVE_STATUSES },
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
      select: { startTime: true, endTime: true },
    });

    const slots: string[] = [];
    const now = new Date();

    for (const rule of rules) {
      const windowStart = parseHmToMinutes(rule.startTime);
      const windowEnd = parseHmToMinutes(rule.endTime);
      const step = rule.slotMin > 0 ? rule.slotMin : 30;

      for (let cursor = windowStart; cursor + durationMin <= windowEnd; cursor += step) {
        const hm = minutesToHm(cursor);
        const start = combineDateAndTimeUtc(query.date, hm);
        const end = addMinutes(start, durationMin);

        if (start <= now) {
          continue;
        }

        const conflict = booked.some((appt) =>
          rangesOverlap(start, end, appt.startTime, appt.endTime),
        );

        if (!conflict) {
          slots.push(hm);
        }
      }
    }

    logger.debug(
      {
        businessId: query.businessId,
        date: query.date,
        slotCount: slots.length,
        event: "availability.slots",
      },
      "Computed availability slots",
    );

    return {
      date: query.date,
      businessId: query.businessId,
      serviceId,
      durationMin,
      slots,
    };
  }

  /** Returns true when the exact start fits an open slot for the service duration. */
  async isSlotAvailable(params: {
    businessId: string;
    serviceId: string;
    startTime: Date;
  }): Promise<boolean> {
    const date = params.startTime.toISOString().slice(0, 10);
    const time = formatTimeUtc(params.startTime);
    const result = await this.getSlots({
      businessId: params.businessId,
      date,
      serviceId: params.serviceId,
    });
    return result.slots.includes(time);
  }

  assertValidDateString(date: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new ValidationError("date must be YYYY-MM-DD");
    }
  }
}

export const availabilityService = new AvailabilityService();
