/** Parse "HH:mm" into minutes from midnight. */
export function parseHmToMinutes(value: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Invalid time format: ${value}`);
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
}

export function minutesToHm(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Display wall-clock HH:mm as 12-hour (e.g. "09:30" → "9:30 AM"). */
export function formatClock12(hm: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!match) return hm;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return hm;
  const suffix = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

/** Build a UTC Date from YYYY-MM-DD + HH:mm (prototype uses UTC business timezone). */
export function combineDateAndTimeUtc(date: string, hm: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = hm.split(":").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!, hour!, minute!, 0, 0));
}

export function formatDateUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatTimeUtc(date: Date): string {
  return date.toISOString().slice(11, 16);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function rangesOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
): boolean {
  return startA < endB && endA > startB;
}

/** Inclusive start / exclusive end day bounds in UTC for a YYYY-MM-DD. */
export function utcDayBounds(date: string): { start: Date; end: Date } {
  const start = combineDateAndTimeUtc(date, "00:00");
  const end = addMinutes(start, 24 * 60);
  return { start, end };
}
