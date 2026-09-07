import { api } from "@/lib/api";
import type { Appointment, AppointmentStatus } from "@/types";

export interface AppointmentDetail extends Appointment {
  businessId: string;
  businessSlug: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  serviceId: string;
  durationMin: number;
  notes: string | null;
  createdAt: string;
}

export interface AvailabilityResponse {
  date: string;
  businessId: string;
  serviceId: string | null;
  durationMin: number;
  slots: string[];
}

export interface BusinessSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  timezone: string;
  activeServiceCount: number;
}

export interface ServiceSummary {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  durationMin: number;
}

export function listAppointments(status?: AppointmentStatus) {
  const query = status ? `?status=${status}` : "";
  return api<{ appointments: AppointmentDetail[] }>(`/api/appointments${query}`);
}

export function getAppointment(id: string) {
  return api<{ appointment: AppointmentDetail }>(`/api/appointments/${id}`);
}

export function createAppointment(input: {
  businessId: string;
  serviceId: string;
  startTime: string;
  notes?: string;
}) {
  return api<{ appointment: AppointmentDetail }>("/api/appointments", {
    method: "POST",
    body: input,
  });
}

export function cancelAppointment(id: string) {
  return api<{ appointment: AppointmentDetail }>(`/api/appointments/${id}/cancel`, {
    method: "PATCH",
  });
}

export function getAvailability(params: {
  businessId: string;
  date: string;
  serviceId?: string;
}) {
  const search = new URLSearchParams({
    businessId: params.businessId,
    date: params.date,
  });
  if (params.serviceId) search.set("serviceId", params.serviceId);
  return api<AvailabilityResponse>(`/api/availability?${search.toString()}`);
}

export function getCalendar(from: string, to: string) {
  const search = new URLSearchParams({ from, to });
  return api<{ from: string; to: string; appointments: AppointmentDetail[] }>(
    `/api/calendar?${search.toString()}`,
  );
}

export function listBusinesses() {
  return api<{ businesses: BusinessSummary[] }>("/api/businesses");
}

export function listBusinessServices(businessId: string) {
  return api<{ services: ServiceSummary[] }>(`/api/businesses/${businessId}/services`);
}
