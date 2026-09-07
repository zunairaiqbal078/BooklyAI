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
  formatAppointmentTime,
  formatMonthLabel,
  startOfUtcMonth,
  utcDateString,
} from "@/lib/datetime";
import { ApiError } from "@/types";
import { cn } from "@/lib/utils";

export function CalendarView() {
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth());
  const [selectedDay, setSelectedDay] = useState(utcDateString(now));
  const [appointments, setAppointments] = useState<AppointmentDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  function shiftMonth(delta: number) {
    const date = new Date(Date.UTC(year, month + delta, 1));
    setYear(date.getUTCFullYear());
    setMonth(date.getUTCMonth());
    setSelectedDay(utcDateString(date));
  }

  if (!user) return null;

  return (
    <AppShell>
      <div className="space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Calendar</p>
            <h1 className="mt-2 font-display text-4xl tracking-tight">
              {user.role === "BUSINESS" ? "Business calendar" : "Your calendar"}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted">
              {user.role === "BUSINESS"
                ? "See booked times for your business. Overlaps are blocked when customers book."
                : "Your confirmed and pending appointments across the month."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="h-9 px-3" onClick={() => shiftMonth(-1)}>
              Previous
            </Button>
            <p className="min-w-36 text-center text-sm font-medium">
              {formatMonthLabel(year, month)}
            </p>
            <Button variant="secondary" className="h-9 px-3" onClick={() => shiftMonth(1)}>
              Next
            </Button>
          </div>
        </header>

        {loading ? <LoadingBlock label="Loading calendar…" /> : null}
        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

        {!loading && !error ? (
          <div className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr]">
            <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
              <div className="mb-3 grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wide text-muted">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((day, index) => {
                  if (!day) return <div key={`blank-${index}`} className="aspect-square" />;
                  const key = utcDateString(new Date(Date.UTC(year, month, day)));
                  const count = byDay.get(key)?.length ?? 0;
                  const selected = key === selectedDay;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDay(key)}
                      className={cn(
                        "flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition",
                        selected
                          ? "bg-accent text-white"
                          : "hover:bg-accent-soft text-foreground",
                      )}
                    >
                      <span>{day}</span>
                      {count > 0 ? (
                        <span
                          className={cn(
                            "mt-1 h-1.5 w-1.5 rounded-full",
                            selected ? "bg-white" : "bg-accent",
                          )}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="font-display text-2xl tracking-tight">{selectedDay}</h2>
              {selectedAppointments.length === 0 ? (
                <EmptyState
                  title="Nothing booked this day"
                  description={
                    user.role === "CUSTOMER"
                      ? "Pick another day, or book with the assistant."
                      : "Open slots stay free until a customer books."
                  }
                  actionHref={user.role === "CUSTOMER" ? ROUTES.assistant : ROUTES.appointments}
                  actionLabel={user.role === "CUSTOMER" ? "Ask AI" : "View appointments"}
                />
              ) : (
                <ul className="space-y-3">
                  {selectedAppointments.map((appointment) => (
                    <li
                      key={appointment.id}
                      className="rounded-2xl border border-line bg-surface px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{appointment.service}</p>
                          <p className="mt-1 text-sm text-muted">
                            {formatAppointmentTime(appointment.startTime)} –{" "}
                            {formatAppointmentTime(appointment.endTime)}
                          </p>
                          <p className="mt-1 text-sm text-muted">
                            {user.role === "CUSTOMER"
                              ? appointment.businessName
                              : appointment.customerName}
                          </p>
                        </div>
                        <StatusBadge status={appointment.status} />
                      </div>
                      <Link
                        href={`${ROUTES.appointments}/${appointment.id}`}
                        className="mt-3 inline-block text-sm text-accent hover:text-accent-hover"
                      >
                        Open details
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
