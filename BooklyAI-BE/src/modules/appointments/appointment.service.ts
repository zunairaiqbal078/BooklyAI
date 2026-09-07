import type { Appointment, AppointmentStatus, Business, Service, User } from "@prisma/client";
import { prisma } from "../../config/database.js";
import { logger } from "../../config/logger.js";
import type { AuthUser } from "../../types/index.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../utils/app-error.js";
import { addMinutes } from "../../utils/time.js";
import { availabilityService } from "../availability/availability.service.js";
import type { CreateAppointmentInput, ListAppointmentsQuery } from "./appointment.schema.js";

const ACTIVE: AppointmentStatus[] = ["PENDING", "CONFIRMED"];

type AppointmentWithRelations = Appointment & {
  business: Pick<Business, "id" | "name" | "slug">;
  service: Pick<Service, "id" | "name" | "durationMin">;
  customer: Pick<User, "id" | "name" | "email">;
  review: { id: string } | null;
};

export interface AppointmentDto {
  id: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  serviceId: string;
  service: string;
  durationMin: number;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes: string | null;
  reviewRequested: boolean;
  hasReview: boolean;
  createdAt: string;
}

function toDto(row: AppointmentWithRelations): AppointmentDto {
  return {
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
    startTime: row.startTime.toISOString(),
    endTime: row.endTime.toISOString(),
    status: row.status,
    notes: row.notes,
    reviewRequested: row.reviewRequested,
    hasReview: Boolean(row.review),
    createdAt: row.createdAt.toISOString(),
  };
}

const appointmentInclude = {
  business: { select: { id: true, name: true, slug: true } },
  service: { select: { id: true, name: true, durationMin: true } },
  customer: { select: { id: true, name: true, email: true } },
  review: { select: { id: true } },
} as const;

export class AppointmentService {
  async create(actor: AuthUser, input: CreateAppointmentInput): Promise<AppointmentDto> {
    if (actor.role !== "CUSTOMER") {
      throw new ForbiddenError("Only customers can book appointments.");
    }

    const startTime = new Date(input.startTime);
    if (Number.isNaN(startTime.getTime())) {
      throw new ValidationError("Invalid startTime.");
    }
    if (startTime.getTime() <= Date.now()) {
      throw new ValidationError("Appointments must be booked in the future.");
    }

    const service = await prisma.service.findFirst({
      where: {
        id: input.serviceId,
        businessId: input.businessId,
        isActive: true,
      },
    });

    if (!service) {
      throw new NotFoundError("Service not found for this business.");
    }

    const endTime = addMinutes(startTime, service.durationMin);

    const available = await availabilityService.isSlotAvailable({
      businessId: input.businessId,
      serviceId: service.id,
      startTime,
    });

    if (!available) {
      throw new ConflictError(
        "APPOINTMENT_CONFLICT",
        "This appointment slot is no longer available.",
      );
    }

    // Defensive overlap check (race-safe enough for the prototype).
    const overlap = await prisma.appointment.findFirst({
      where: {
        businessId: input.businessId,
        status: { in: ACTIVE },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: { id: true },
    });

    if (overlap) {
      logger.info(
        {
          businessId: input.businessId,
          startTime: startTime.toISOString(),
          event: "appointment.conflict",
        },
        "Appointment conflict",
      );
      throw new ConflictError(
        "APPOINTMENT_CONFLICT",
        "This appointment slot is no longer available.",
      );
    }

    const created = await prisma.appointment.create({
      data: {
        businessId: input.businessId,
        customerId: actor.id,
        serviceId: service.id,
        startTime,
        endTime,
        status: "CONFIRMED",
        notes: input.notes ?? null,
      },
      include: appointmentInclude,
    });

    logger.info(
      {
        appointmentId: created.id,
        businessId: created.businessId,
        customerId: created.customerId,
        event: "appointment.created",
      },
      "Appointment created",
    );

    return toDto(created);
  }

  async list(actor: AuthUser, query: ListAppointmentsQuery): Promise<AppointmentDto[]> {
    const where =
      actor.role === "CUSTOMER"
        ? {
            customerId: actor.id,
            ...(query.status ? { status: query.status } : {}),
          }
        : {
            businessId: actor.businessId ?? "00000000-0000-0000-0000-000000000000",
            ...(query.status ? { status: query.status } : {}),
          };

    if (actor.role === "BUSINESS" && !actor.businessId) {
      throw new ForbiddenError("Business profile is incomplete.");
    }

    const rows = await prisma.appointment.findMany({
      where,
      include: appointmentInclude,
      orderBy: { startTime: "asc" },
    });

    return rows.map(toDto);
  }

  async getById(actor: AuthUser, id: string): Promise<AppointmentDto> {
    const row = await prisma.appointment.findUnique({
      where: { id },
      include: appointmentInclude,
    });

    if (!row) {
      throw new NotFoundError("Appointment not found.");
    }

    this.assertCanAccess(actor, row);
    return toDto(row);
  }

  async cancel(actor: AuthUser, id: string): Promise<AppointmentDto> {
    const row = await prisma.appointment.findUnique({
      where: { id },
      include: appointmentInclude,
    });

    if (!row) {
      throw new NotFoundError("Appointment not found.");
    }

    this.assertCanAccess(actor, row);

    if (row.status === "CANCELLED") {
      throw new ConflictError("ALREADY_CANCELLED", "This appointment is already cancelled.");
    }

    if (row.status === "COMPLETED") {
      throw new ConflictError("ALREADY_COMPLETED", "Completed appointments cannot be cancelled.");
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: appointmentInclude,
    });

    logger.info(
      { appointmentId: id, actorId: actor.id, event: "appointment.cancelled" },
      "Appointment cancelled",
    );

    return toDto(updated);
  }

  async complete(actor: AuthUser, id: string): Promise<AppointmentDto> {
    if (actor.role !== "BUSINESS" || !actor.businessId) {
      throw new ForbiddenError("Only business owners can mark appointments complete.");
    }

    const row = await prisma.appointment.findUnique({
      where: { id },
      include: appointmentInclude,
    });
    if (!row) {
      throw new NotFoundError("Appointment not found.");
    }
    if (row.businessId !== actor.businessId) {
      throw new ForbiddenError("You do not have access to this appointment.");
    }
    if (row.status === "CANCELLED") {
      throw new ConflictError("CANCELLED", "Cancelled appointments cannot be completed.");
    }
    if (row.status === "COMPLETED") {
      return toDto(row);
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: "COMPLETED", reviewRequested: true },
      include: appointmentInclude,
    });

    logger.info(
      { appointmentId: id, actorId: actor.id, event: "appointment.completed" },
      "Appointment completed",
    );

    return toDto(updated);
  }

  async requestReview(actor: AuthUser, id: string): Promise<AppointmentDto> {
    if (actor.role !== "BUSINESS" || !actor.businessId) {
      throw new ForbiddenError("Only business owners can request reviews.");
    }

    const row = await prisma.appointment.findUnique({
      where: { id },
      include: appointmentInclude,
    });
    if (!row) {
      throw new NotFoundError("Appointment not found.");
    }
    if (row.businessId !== actor.businessId) {
      throw new ForbiddenError("You do not have access to this appointment.");
    }
    if (row.status !== "COMPLETED") {
      throw new ValidationError("Complete the appointment before requesting a review.");
    }
    if (row.review) {
      throw new ConflictError("ALREADY_REVIEWED", "This appointment already has a review.");
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { reviewRequested: true },
      include: appointmentInclude,
    });

    return toDto(updated);
  }

  async summarizeForBusiness(actor: AuthUser) {
    if (actor.role !== "BUSINESS" || !actor.businessId) {
      throw new ForbiddenError("Business profile is required.");
    }

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const rows = await prisma.appointment.findMany({
      where: { businessId: actor.businessId },
      include: {
        ...appointmentInclude,
        service: { select: { id: true, name: true, durationMin: true, priceCents: true } },
      },
      orderBy: { startTime: "asc" },
    });

    const upcoming = rows.filter(
      (row) =>
        (row.status === "CONFIRMED" || row.status === "PENDING") &&
        row.startTime.getTime() >= now.getTime(),
    );
    const today = upcoming.filter(
      (row) => row.startTime >= startOfToday && row.startTime < endOfToday,
    );
    const completed = rows.filter((row) => row.status === "COMPLETED");
    const cancelled = rows.filter((row) => row.status === "CANCELLED");
    const pending = rows.filter((row) => row.status === "PENDING");
    const confirmed = rows.filter((row) => row.status === "CONFIRMED");

    const paidRevenueCents = completed.reduce(
      (sum, row) => sum + (row.service.priceCents ?? 0),
      0,
    );

    return {
      total: rows.length,
      upcoming: upcoming.length,
      today: today.length,
      pending: pending.length,
      confirmed: confirmed.length,
      completed: completed.length,
      cancelled: cancelled.length,
      /** Completed visits used as paid until a payments module exists. */
      paidCount: completed.length,
      paidRevenueCents,
      upcomingAppointments: upcoming.slice(0, 10).map(toDto),
      todayAppointments: today.map(toDto),
      completedAppointments: completed.slice(-10).map(toDto),
    };
  }

  private assertCanAccess(
    actor: AuthUser,
    row: Pick<Appointment, "customerId" | "businessId">,
  ): void {
    if (actor.role === "CUSTOMER" && row.customerId === actor.id) {
      return;
    }
    if (actor.role === "BUSINESS" && actor.businessId && row.businessId === actor.businessId) {
      return;
    }
    throw new ForbiddenError("You do not have access to this appointment.");
  }
}

export const appointmentService = new AppointmentService();
