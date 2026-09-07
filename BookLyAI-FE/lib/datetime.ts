import type { AppointmentStatus } from "@/types";

/** Appointment instants — shown in the viewer's local timezone, 12-hour clock. */
const dateFmt = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const timeFmt = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const monthFmt = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});

const clockFmt = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "UTC",
});

export function formatAppointmentDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

/** 12-hour time in the viewer's local timezone (converts from stored UTC instant). */
export function formatAppointmentTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

export function formatAppointmentDateTime(iso: string): string {
  return `${formatAppointmentDate(iso)} · ${formatAppointmentTime(iso)}`;
}

/**
 * Format a wall-clock `HH:mm` (business hours / availability slots) as 12-hour.
 * These are not converted across zones — they are the business's posted clock times.
 */
export function formatClockTime(hm: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!match) return hm;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return hm;
  const date = new Date(Date.UTC(2000, 0, 1, hours, minutes, 0));
  return clockFmt.format(date);
}

export function formatClockRange(startHm: string, endHm: string): string {
  return `${formatClockTime(startHm)} – ${formatClockTime(endHm)}`;
}

export function formatMonthLabel(year: number, monthIndex: number): string {
  return monthFmt.format(new Date(year, monthIndex, 1));
}

export function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

/** Local calendar date key for "today" comparisons. */
export function localDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function statusLabel(status: AppointmentStatus): string {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "CONFIRMED":
      return "Confirmed";
    case "CANCELLED":
      return "Cancelled";
    case "COMPLETED":
      return "Completed";
  }
}

export function isActiveStatus(status: AppointmentStatus): boolean {
  return status === "PENDING" || status === "CONFIRMED";
}

export function startOfUtcMonth(year: number, monthIndex: number): Date {
  return new Date(Date.UTC(year, monthIndex, 1));
}

export function endOfUtcMonth(year: number, monthIndex: number): Date {
  return new Date(Date.UTC(year, monthIndex + 1, 0));
}

export function utcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function greetingForNow(name: string): string {
  const hour = new Date().getHours();
  const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return `${part}, ${name.split(" ")[0] ?? name}`;
}
