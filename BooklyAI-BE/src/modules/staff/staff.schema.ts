import { z } from "zod";
import { StaffPermission, LeaveStatus } from "@prisma/client";

export const staffPermissionSchema = z.nativeEnum(StaffPermission);

export const staffWorkingHourSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format HH:mm required"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format HH:mm required"),
});

export const createStaffSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  title: z.string().min(2).default("Team Member"),
  avatarUrl: z.string().url().optional().nullable(),
  permissions: z.array(staffPermissionSchema).default([StaffPermission.VIEW_CALENDAR]),
  serviceIds: z.array(z.string().uuid()).default([]),
  workingHours: z.array(staffWorkingHourSchema).optional(),
});

export const updateStaffSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  title: z.string().min(2).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
  permissions: z.array(staffPermissionSchema).optional(),
  serviceIds: z.array(z.string().uuid()).optional(),
  workingHours: z.array(staffWorkingHourSchema).optional(),
});

export const createStaffLeaveSchema = z.object({
  startDate: z.string().datetime({ message: "Must be ISO-8601 date string" }),
  endDate: z.string().datetime({ message: "Must be ISO-8601 date string" }),
  reason: z.string().max(255).optional().nullable(),
  status: z.nativeEnum(LeaveStatus).default(LeaveStatus.APPROVED),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type CreateStaffLeaveInput = z.infer<typeof createStaffLeaveSchema>;
export type StaffWorkingHourInput = z.infer<typeof staffWorkingHourSchema>;
