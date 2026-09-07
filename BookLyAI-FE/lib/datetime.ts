import type { AppointmentStatus } from "@/types";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "UTC",
});

const monthFmt = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatAppointmentDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

export function formatAppointmentTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

export function formatMonthLabel(year: number, monthIndex: number): string {
  return monthFmt.format(new Date(Date.UTC(year, monthIndex, 1)));
}

export function toDateKey(iso: string): string {
  return iso.slice(0, 10);
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
