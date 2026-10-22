import { api } from "@/lib/api";
import type {
  StaffMember,
  CreateStaffInput,
  UpdateStaffInput,
  CreateStaffLeaveInput,
  StaffLeave,
} from "@/types/staff";

export function listStaff() {
  return api<{ staff: StaffMember[] }>("/api/staff");
}

export function getStaff(id: string) {
  return api<{ staff: StaffMember }>(`/api/staff/${id}`);
}

export function createStaff(input: CreateStaffInput) {
  return api<{ staff: StaffMember }>("/api/staff", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateStaff(id: string, input: UpdateStaffInput) {
  return api<{ staff: StaffMember }>(`/api/staff/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteStaff(id: string) {
  return api<{ success: boolean; message: string }>(`/api/staff/${id}`, {
    method: "DELETE",
  });
}

export function addStaffLeave(staffId: string, input: CreateStaffLeaveInput) {
  return api<{ leave: StaffLeave }>(`/api/staff/${staffId}/leaves`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listStaffLeaves(staffId: string) {
  return api<{ leaves: StaffLeave[] }>(`/api/staff/${staffId}/leaves`);
}

export function deleteStaffLeave(staffId: string, leaveId: string) {
  return api<{ success: boolean; message: string }>(
    `/api/staff/${staffId}/leaves/${leaveId}`,
    {
      method: "DELETE",
    },
  );
}
