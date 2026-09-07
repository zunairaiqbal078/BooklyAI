"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { AppointmentCard } from "@/components/appointments/appointment-card";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonRows } from "@/components/ui/loading-block";
import { ROUTES } from "@/constants";
import { cancelAppointment, listAppointments, type AppointmentDetail } from "@/features/appointments/api";
import { useAuth } from "@/features/auth/auth-provider";
import { useLoadWhen } from "@/hooks/use-load-when";
import { greetingForNow, toDateKey } from "@/lib/datetime";
import { ApiError } from "@/types";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DashboardView() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [nowMs] = useState(() => Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { appointments: rows } = await listAppointments();
      setAppointments(rows);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load appointments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useLoadWhen(Boolean(user), load);

  const stats = useMemo(() => {
    const today = todayKey();
    return {
      upcoming: appointments.filter(
        (a) =>
          (a.status === "CONFIRMED" || a.status === "PENDING") &&
          new Date(a.startTime).getTime() >= nowMs,
      ),
      today: appointments.filter(
        (a) =>
          toDateKey(a.startTime) === today &&
          (a.status === "CONFIRMED" || a.status === "PENDING"),
      ),
      completed: appointments.filter((a) => a.status === "COMPLETED"),
      cancelled: appointments.filter((a) => a.status === "CANCELLED"),
    };
  }, [appointments, nowMs]);

  async function handleCancel(id: string) {
    setCancellingId(id);
    try {
      await cancelAppointment(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not cancel appointment.");
    } finally {
      setCancellingId(null);
    }
  }

  if (!user) return null;

  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Dashboard</p>
            <h1 className="mt-2 font-display text-4xl tracking-tight">
              {greetingForNow(user.name)}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {user.role === "BUSINESS"
                ? "Here’s what’s on your business calendar."
                : "Here’s what’s coming up for you."}
            </p>
          </div>
          <div className="rounded-full border border-line bg-surface px-4 py-2 text-sm text-muted">
            {user.email} · {user.role === "BUSINESS" ? "Business" : "Customer"}
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Upcoming", value: stats.upcoming.length },
            { label: "Today", value: stats.today.length },
            { label: "Completed", value: stats.completed.length },
            { label: "Cancelled", value: stats.cancelled.length },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-line bg-surface px-5 py-4"
            >
              <p className="text-xs uppercase tracking-[0.14em] text-muted">{item.label}</p>
              <p className="mt-2 font-display text-3xl tracking-tight">{item.value}</p>
            </div>
          ))}
        </section>

        <section>
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-muted">
            Quick actions
          </p>
          <div className="flex flex-wrap gap-3">
            {user.role === "CUSTOMER" ? (
              <Link href={ROUTES.assistant}>
                <Button>Ask AI</Button>
              </Link>
            ) : null}
            <Link href={ROUTES.appointments}>
              <Button variant={user.role === "CUSTOMER" ? "secondary" : "primary"}>
                {user.role === "CUSTOMER" ? "Book appointment" : "View appointments"}
              </Button>
            </Link>
            <Link href={ROUTES.calendar}>
              <Button variant="secondary">View calendar</Button>
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl tracking-tight">Upcoming appointments</h2>
            <Link href={ROUTES.appointments} className="text-sm text-accent hover:text-accent-hover">
              View all
            </Link>
          </div>

          {loading ? <SkeletonRows count={3} /> : null}
          {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

          {!loading && !error && stats.upcoming.length === 0 ? (
            <EmptyState
              title="No upcoming appointments"
              description={
                user.role === "CUSTOMER"
                  ? "Book through the assistant or the appointments page."
                  : "When customers book, their appointments will show up here."
              }
              actionHref={user.role === "CUSTOMER" ? ROUTES.assistant : ROUTES.calendar}
              actionLabel={user.role === "CUSTOMER" ? "Ask AI to book" : "Open calendar"}
            />
          ) : null}

          {!loading && !error
            ? stats.upcoming.slice(0, 5).map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  perspective={user.role}
                  onCancel={handleCancel}
                  cancellingId={cancellingId}
                />
              ))
            : null}
        </section>
      </div>
    </AppShell>
  );
}
