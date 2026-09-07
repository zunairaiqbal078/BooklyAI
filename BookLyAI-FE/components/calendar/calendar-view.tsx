"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingBlock } from "@/components/ui/loading-block";
import { StatusBadge } from "@/components/ui/status-badge";
import { ROUTES } from "@/constants";
import { getCalendar, type AppointmentDetail } from "@/features/appointments/api";
import { useAuth } from "@/features/auth/auth-provider";
import { useLoadWhen } from "@/hooks/use-load-when";
import {
  endOfUtcMonth,
  formatAppointmentDate,
  formatAppointmentTime,
  formatMonthLabel,
  startOfUtcMonth,
  utcDateString,
} from "@/lib/datetime";
import { ApiError } from "@/types";
import { cn } from "@/lib/utils";

function formatMoney(cents: number | null): string | null {
  if (cents == null) return null;
  return `$${(cents / 100).toFixed(0)}`;
}

function HoverPreview({
  appointments,
  isBusiness,
  alignEnd,
}: {
  appointments: AppointmentDetail[];
  isBusiness: boolean;
  alignEnd: boolean;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-[calc(100%+8px)] z-30 w-56 rounded-2xl border border-line bg-surface p-3 opacity-0 shadow-[0_18px_40px_rgba(18,32,28,0.14)] transition duration-200",
        "invisible scale-95 group-hover:visible group-hover:scale-100 group-hover:opacity-100 group-focus-within:visible group-focus-within:scale-100 group-focus-within:opacity-100",
        alignEnd ? "right-0" : "left-0",
      )}
      role="tooltip"
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
        {appointments.length} booking{appointments.length === 1 ? "" : "s"}
      </p>
      <ul className="mt-2 space-y-2">
        {appointments.slice(0, 3).map((appointment) => (
          <li key={appointment.id} className="rounded-xl bg-background px-2.5 py-2">
            <p className="truncate text-xs font-medium text-foreground">
              {isBusiness ? appointment.customerName : appointment.businessName}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-muted">{appointment.service}</p>
            <p className="mt-0.5 text-[11px] text-accent">
              {formatAppointmentTime(appointment.startTime)} –{" "}
              {formatAppointmentTime(appointment.endTime)}
            </p>
          </li>
        ))}
      </ul>
      {appointments.length > 3 ? (
        <p className="mt-2 text-[11px] text-muted">+{appointments.length - 3} more this day</p>
      ) : null}
    </div>
  );
}

export function CalendarView() {
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth());
  const [selectedDay, setSelectedDay] = useState(utcDateString(now));
  const [appointments, setAppointments] = useState<AppointmentDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const todayKey = utcDateString(now);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = utcDateString(startOfUtcMonth(year, month));
      const to = utcDateString(endOfUtcMonth(year, month));
      const result = await getCalendar(from, to);
      setAppointments(result.appointments);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load calendar.");
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useLoadWhen(Boolean(user), load, `${year}-${month}`);

  const byDay = useMemo(() => {
    const map = new Map<string, AppointmentDetail[]>();
    for (const appointment of appointments) {
      const key = appointment.startTime.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(appointment);
      map.set(key, list);
    }
    return map;
  }, [appointments]);

  const cells = useMemo(() => {
    const first = startOfUtcMonth(year, month);
    const startWeekday = first.getUTCDay();
    const daysInMonth = endOfUtcMonth(year, month).getUTCDate();
    const blanks = Array.from({ length: startWeekday }, () => null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    return [...blanks, ...days];
  }, [year, month]);

  const selectedAppointments = byDay.get(selectedDay) ?? [];
  const monthBookings = appointments.length;

  const selectedLabel = useMemo(() => {
    return formatAppointmentDate(`${selectedDay}T12:00:00.000Z`);
  }, [selectedDay]);

  function shiftMonth(delta: number) {
    const date = new Date(Date.UTC(year, month + delta, 1));
    setYear(date.getUTCFullYear());
    setMonth(date.getUTCMonth());
    setSelectedDay(utcDateString(date));
  }

  if (!user) return null;

  const isBusiness = user.role === "BUSINESS";

  return (
    <AppShell>
      <div className="space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Calendar</p>
            <h1 className="mt-2 font-display text-4xl tracking-tight">
              {isBusiness ? "Business calendar" : "Your calendar"}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Hover a booked day for customer, service, and time. Click a day for full details.
            </p>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border border-line bg-surface p-1 shadow-sm">
            <Button
              variant="ghost"
              className="h-9 rounded-full px-3"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
            >
              ←
            </Button>
            <p className="min-w-36 text-center text-sm font-medium">
              {formatMonthLabel(year, month)}
            </p>
            <Button
              variant="ghost"
              className="h-9 rounded-full px-3"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
            >
              →
            </Button>
          </div>
        </header>

        {loading ? <LoadingBlock label="Loading calendar…" /> : null}
        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

        {!loading && !error ? (
          <div className="grid gap-6 lg:grid-cols-[1.45fr_0.95fr]">
            <section className="overflow-hidden rounded-[1.75rem] border border-line bg-[linear-gradient(165deg,#f7faf8_0%,#eef5f2_48%,#e7f0ec_100%)] shadow-[0_20px_50px_rgba(15,76,69,0.06)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-5 py-4">
                <div>
                  <p className="font-display text-2xl tracking-tight">
                    {formatMonthLabel(year, month)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {monthBookings} appointment{monthBookings === 1 ? "" : "s"} this month
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-accent" />
                    Booked
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full ring-2 ring-accent/40 ring-offset-1" />
                    Today
                  </span>
                </div>
              </div>

              <div className="p-3 sm:p-5">
                <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="py-2">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {cells.map((day, index) => {
                    if (!day) {
                      return <div key={`blank-${index}`} className="min-h-14 sm:min-h-16" />;
                    }

                    const key = utcDateString(new Date(Date.UTC(year, month, day)));
                    const dayAppointments = byDay.get(key) ?? [];
                    const selected = key === selectedDay;
                    const isToday = key === todayKey;
                    const hasBookings = dayAppointments.length > 0;
                    const weekday = new Date(Date.UTC(year, month, day)).getUTCDay();
                    const alignEnd = weekday >= 5;

                    return (
                      <div key={key} className="group relative">
                        <button
                          type="button"
                          onClick={() => setSelectedDay(key)}
                          className={cn(
                            "relative flex h-14 w-full flex-col items-center justify-center rounded-2xl border text-sm transition duration-200 sm:h-16",
                            selected
                              ? "border-accent bg-accent text-white shadow-[0_10px_24px_rgba(15,76,69,0.28)]"
                              : hasBookings
                                ? "border-accent/20 bg-surface text-foreground hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
                                : "border-transparent bg-surface/50 text-foreground hover:bg-surface",
                            isToday && !selected ? "ring-2 ring-accent/25 ring-offset-1 ring-offset-transparent" : "",
                          )}
                        >
                          <span
                            className={cn(
                              "font-medium tabular-nums",
                              selected ? "text-white" : "text-foreground",
                            )}
                          >
                            {day}
                          </span>
                          {hasBookings ? (
                            <span className="mt-1.5 flex items-center gap-0.5">
                              {dayAppointments.slice(0, 3).map((appointment) => (
                                <span
                                  key={appointment.id}
                                  className={cn(
                                    "h-1.5 w-1.5 rounded-full",
                                    selected ? "bg-white/90" : "bg-accent",
                                  )}
                                />
                              ))}
                            </span>
                          ) : (
                            <span className="mt-1.5 h-1.5" />
                          )}
                        </button>

                        {hasBookings ? (
                          <HoverPreview
                            appointments={dayAppointments}
                            isBusiness={isBusiness}
                            alignEnd={alignEnd}
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <aside className="space-y-4">
              <div className="rounded-[1.75rem] border border-line bg-surface p-5 shadow-[0_16px_40px_rgba(15,76,69,0.05)]">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
                  Selected day
                </p>
                <h2 className="mt-2 font-display text-3xl tracking-tight">{selectedLabel}</h2>
                <p className="mt-1 text-sm text-muted">
                  {selectedAppointments.length === 0
                    ? "No bookings"
                    : `${selectedAppointments.length} appointment${selectedAppointments.length === 1 ? "" : "s"}`}
                </p>
              </div>

              {selectedAppointments.length === 0 ? (
                <EmptyState
                  title="Nothing booked this day"
                  description={
                    isBusiness
                      ? "Open slots stay free until a customer books."
                      : "Pick another day, or book with the assistant."
                  }
                  actionHref={isBusiness ? ROUTES.appointments : ROUTES.assistant}
                  actionLabel={isBusiness ? "View appointments" : "Ask AI"}
                />
              ) : (
                <ul className="space-y-3">
                  {selectedAppointments.map((appointment) => (
                    <li
                      key={appointment.id}
                      className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition hover:border-accent/30"
                    >
                      <div className="border-l-4 border-accent px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{appointment.service}</p>
                            <p className="mt-1 text-sm text-accent">
                              {formatAppointmentTime(appointment.startTime)} –{" "}
                              {formatAppointmentTime(appointment.endTime)}
                            </p>
                            <p className="mt-2 text-sm text-foreground">
                              {isBusiness ? appointment.customerName : appointment.businessName}
                            </p>
                            {isBusiness ? (
                              <p className="mt-0.5 truncate text-xs text-muted">
                                {appointment.customerEmail}
                              </p>
                            ) : null}
                            {formatMoney(appointment.priceCents) ? (
                              <p className="mt-2 text-xs text-muted">
                                {formatMoney(appointment.priceCents)}
                              </p>
                            ) : null}
                          </div>
                          <StatusBadge status={appointment.status} />
                        </div>
                        <Link
                          href={`${ROUTES.appointments}/${appointment.id}`}
                          className="mt-3 inline-flex text-sm font-medium text-accent transition hover:text-accent-hover"
                        >
                          Open details →
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
