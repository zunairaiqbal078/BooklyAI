export type StaffPermission =
  | "VIEW_CALENDAR"
  | "MANAGE_CALENDAR"
  | "CHAT_CLIENTS"
  | "MANAGE_SERVICES"
  | "MANAGE_STAFF"
  | "VIEW_ANALYTICS";

export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface StaffWorkingHour {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface StaffLeave {
  id: string;
  staffId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: LeaveStatus;
  createdAt: string;
}

export interface StaffMember {
  id: string;
  businessId: string;
  userId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  title: string;
  avatarUrl: string | null;
  isActive: boolean;
  permissions: StaffPermission[];
  createdAt: string;
  updatedAt: string;
  services?: Array<{
    id: string;
    name: string;
    durationMin?: number;
    priceCents?: number | null;
  }>;
  availabilityRules?: StaffWorkingHour[];
  leaves?: StaffLeave[];
}

export interface CreateStaffInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  title?: string;
  permissions?: StaffPermission[];
  serviceIds?: string[];
  workingHours?: StaffWorkingHour[];
}

export interface UpdateStaffInput {
  name?: string;
  email?: string | null;
  phone?: string | null;
  title?: string;
  isActive?: boolean;
  permissions?: StaffPermission[];
  serviceIds?: string[];
  workingHours?: StaffWorkingHour[];
}

export interface CreateStaffLeaveInput {
  startDate: string;
  endDate: string;
  reason?: string | null;
  status?: LeaveStatus;
}
