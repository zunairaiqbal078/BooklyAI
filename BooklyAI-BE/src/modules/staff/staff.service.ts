import { prisma } from "../../config/database.js";
import { logger } from "../../config/logger.js";
import { NotFoundError, ValidationError } from "../../utils/app-error.js";
import type {
  CreateStaffInput,
  UpdateStaffInput,
  CreateStaffLeaveInput,
} from "./staff.schema.js";

export class StaffService {
  async listByBusiness(businessId: string) {
    return prisma.staffMember.findMany({
      where: { businessId },
      include: {
        services: {
          select: { id: true, name: true, durationMin: true, priceCents: true },
        },
        availabilityRules: {
          orderBy: { dayOfWeek: "asc" },
        },
        leaves: {
          where: {
            endDate: { gte: new Date() },
          },
          orderBy: { startDate: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async getById(businessId: string, staffId: string) {
    const staff = await prisma.staffMember.findFirst({
      where: { id: staffId, businessId },
      include: {
        services: {
          select: { id: true, name: true, durationMin: true, priceCents: true },
        },
        availabilityRules: {
          orderBy: { dayOfWeek: "asc" },
        },
        leaves: {
          orderBy: { startDate: "desc" },
        },
      },
    });

    if (!staff) {
      throw new NotFoundError("Staff member not found for this business.");
    }

    return staff;
  }

  async create(businessId: string, input: CreateStaffInput) {
    return prisma.$transaction(async (tx) => {
      // Validate services belong to this business
      if (input.serviceIds && input.serviceIds.length > 0) {
        const validServices = await tx.service.findMany({
          where: {
            id: { in: input.serviceIds },
            businessId,
          },
          select: { id: true },
        });

        if (validServices.length !== input.serviceIds.length) {
          throw new ValidationError("One or more services do not belong to this business.");
        }
      }

      const staff = await tx.staffMember.create({
        data: {
          businessId,
          name: input.name.trim(),
          email: input.email ? input.email.trim().toLowerCase() : null,
          phone: input.phone?.trim() ?? null,
          title: input.title.trim(),
          avatarUrl: input.avatarUrl ?? null,
          permissions: input.permissions,
          services: {
            connect: input.serviceIds.map((id) => ({ id })),
          },
          availabilityRules: input.workingHours
            ? {
                create: input.workingHours.map((h) => ({
                  dayOfWeek: h.dayOfWeek,
                  startTime: h.startTime,
                  endTime: h.endTime,
                })),
              }
            : undefined,
        },
        include: {
          services: {
            select: { id: true, name: true },
          },
          availabilityRules: true,
        },
      });

      logger.info(
        { staffId: staff.id, businessId, event: "staff.created" },
        "Staff member created",
      );

      return staff;
    });
  }

  async update(businessId: string, staffId: string, input: UpdateStaffInput) {
    const existing = await prisma.staffMember.findFirst({
      where: { id: staffId, businessId },
    });

    if (!existing) {
      throw new NotFoundError("Staff member not found.");
    }

    return prisma.$transaction(async (tx) => {
      // If updating services, validate they belong to this business
      let servicesUpdate;
      if (input.serviceIds !== undefined) {
        const validServices = await tx.service.findMany({
          where: {
            id: { in: input.serviceIds },
            businessId,
          },
          select: { id: true },
        });

        if (validServices.length !== input.serviceIds.length) {
          throw new ValidationError("One or more services do not belong to this business.");
        }

        servicesUpdate = {
          set: input.serviceIds.map((id) => ({ id })),
        };
      }

      // If updating working hours, replace existing rules
      if (input.workingHours !== undefined) {
        await tx.staffAvailabilityRule.deleteMany({
          where: { staffId },
        });
        if (input.workingHours.length > 0) {
          await tx.staffAvailabilityRule.createMany({
            data: input.workingHours.map((h) => ({
              staffId,
              dayOfWeek: h.dayOfWeek,
              startTime: h.startTime,
              endTime: h.endTime,
            })),
          });
        }
      }

      const updated = await tx.staffMember.update({
        where: { id: staffId },
        data: {
          name: input.name !== undefined ? input.name.trim() : undefined,
          email: input.email !== undefined ? (input.email ? input.email.trim().toLowerCase() : null) : undefined,
          phone: input.phone !== undefined ? (input.phone ? input.phone.trim() : null) : undefined,
          title: input.title !== undefined ? input.title.trim() : undefined,
          avatarUrl: input.avatarUrl !== undefined ? input.avatarUrl : undefined,
          isActive: input.isActive !== undefined ? input.isActive : undefined,
          permissions: input.permissions !== undefined ? input.permissions : undefined,
          services: servicesUpdate,
        },
        include: {
          services: {
            select: { id: true, name: true },
          },
          availabilityRules: {
            orderBy: { dayOfWeek: "asc" },
          },
        },
      });

      logger.info(
        { staffId: updated.id, businessId, event: "staff.updated" },
        "Staff member updated",
      );

      return updated;
    });
  }

  async delete(businessId: string, staffId: string) {
    const existing = await prisma.staffMember.findFirst({
      where: { id: staffId, businessId },
    });

    if (!existing) {
      throw new NotFoundError("Staff member not found.");
    }

    // Soft-deactivate to preserve appointment foreign-key historical integrity
    await prisma.staffMember.update({
      where: { id: staffId },
      data: { isActive: false },
    });

    logger.info({ staffId, businessId, event: "staff.deactivated" }, "Staff member deactivated");
    return { success: true, message: "Staff member deactivated." };
  }

  async addLeave(businessId: string, staffId: string, input: CreateStaffLeaveInput) {
    const staff = await prisma.staffMember.findFirst({
      where: { id: staffId, businessId },
    });

    if (!staff) {
      throw new NotFoundError("Staff member not found.");
    }

    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new ValidationError("Invalid start or end date.");
    }

    if (endDate.getTime() <= startDate.getTime()) {
      throw new ValidationError("End date must be after start date.");
    }

    const leave = await prisma.staffLeave.create({
      data: {
        staffId,
        startDate,
        endDate,
        reason: input.reason?.trim() ?? null,
        status: input.status,
      },
    });

    logger.info(
      { leaveId: leave.id, staffId, businessId, event: "staff.leave_added" },
      "Staff leave created",
    );

    return leave;
  }

  async listLeaves(businessId: string, staffId: string) {
    const staff = await prisma.staffMember.findFirst({
      where: { id: staffId, businessId },
    });

    if (!staff) {
      throw new NotFoundError("Staff member not found.");
    }

    return prisma.staffLeave.findMany({
      where: { staffId },
      orderBy: { startDate: "desc" },
    });
  }

  async deleteLeave(businessId: string, staffId: string, leaveId: string) {
    const leave = await prisma.staffLeave.findFirst({
      where: {
        id: leaveId,
        staffId,
        staff: { businessId },
      },
    });

    if (!leave) {
      throw new NotFoundError("Leave record not found.");
    }

    await prisma.staffLeave.delete({
      where: { id: leaveId },
    });

    logger.info(
      { leaveId, staffId, businessId, event: "staff.leave_deleted" },
      "Staff leave deleted",
    );

    return { success: true, message: "Leave record removed." };
  }
}

export const staffService = new StaffService();
