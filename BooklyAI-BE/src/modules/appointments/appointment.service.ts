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
    createdAt: row.createdAt.toISOString(),
  };
}

const appointmentInclude = {
  business: { select: { id: true, name: true, slug: true } },
  service: { select: { id: true, name: true, durationMin: true } },
  customer: { select: { id: true, name: true, email: true } },
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
