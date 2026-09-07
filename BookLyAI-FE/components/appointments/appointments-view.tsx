"use client";

import { useCallback, useMemo, useState } from "react";
import { AppointmentCard } from "@/components/appointments/appointment-card";
import { BookAppointmentForm } from "@/components/appointments/book-appointment-form";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonRows } from "@/components/ui/loading-block";
import { ROUTES } from "@/constants";
import {
  cancelAppointment,
  listAppointments,
  type AppointmentDetail,
} from "@/features/appointments/api";
import { useAuth } from "@/features/auth/auth-provider";
import { useLoadWhen } from "@/hooks/use-load-when";
import { ApiError, type AppointmentStatus } from "@/types";
import { cn } from "@/lib/utils";

const filters: Array<{ id: "ALL" | AppointmentStatus; label: string }> = [
  { id: "ALL", label: "All" },
  { id: "CONFIRMED", label: "Confirmed" },
  { id: "PENDING", label: "Pending" },
  { id: "COMPLETED", label: "Completed" },
  { id: "CANCELLED", label: "Cancelled" },
];

export function AppointmentsView() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentDetail[]>([]);
  const [filter, setFilter] = useState<"ALL" | AppointmentStatus>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showBookForm, setShowBookForm] = useState(false);

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

  const filtered = useMemo(() => {
    const rows = filter === "ALL" ? appointments : appointments.filter((a) => a.status === filter);
    return [...rows].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }, [appointments, filter]);

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
      <div className="space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
              Appointments
            </p>
            <h1 className="mt-2 font-display text-4xl tracking-tight">Your schedule</h1>
            <p className="mt-2 text-sm text-muted">
              {user.role === "BUSINESS"
                ? "Every booking for your business, without overlaps."
                : "Review, open details, or cancel upcoming visits."}
            </p>
          </div>
          {user.role === "CUSTOMER" ? (
            <button
              type="button"
              onClick={() => setShowBookForm((value) => !value)}
              className="self-start rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover"
            >
              {showBookForm ? "Hide form" : "Book appointment"}
            </button>
          ) : null}
        </header>

        {user.role === "CUSTOMER" && showBookForm ? (
          <BookAppointmentForm
            onBooked={async () => {
              setShowBookForm(false);
              await load();
            }}
          />
        ) : null}

        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
                filter === item.id
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line bg-surface text-muted hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading ? <SkeletonRows count={4} /> : null}
        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

        {!loading && !error && filtered.length === 0 ? (
          <EmptyState
            title="No appointments here"
            description="Try another filter, or book a new appointment."
            actionHref={user.role === "CUSTOMER" ? ROUTES.assistant : ROUTES.calendar}
            actionLabel={user.role === "CUSTOMER" ? "Ask AI" : "Open calendar"}
          />
        ) : null}

        <div className="space-y-3">
          {!loading && !error
            ? filtered.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  perspective={user.role}
                  onCancel={handleCancel}
                  cancellingId={cancellingId}
                />
              ))
            : null}
        </div>
      </div>
    </AppShell>
  );
}
