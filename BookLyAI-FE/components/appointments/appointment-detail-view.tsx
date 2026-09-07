"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingBlock } from "@/components/ui/loading-block";
import { StatusBadge } from "@/components/ui/status-badge";
import { ROUTES } from "@/constants";
import {
  cancelAppointment,
  getAppointment,
  type AppointmentDetail,
} from "@/features/appointments/api";
import { useAuth } from "@/features/auth/auth-provider";
import { useLoadWhen } from "@/hooks/use-load-when";
import {
  formatAppointmentDate,
  formatAppointmentTime,
  isActiveStatus,
} from "@/lib/datetime";
import { ApiError } from "@/types";

export function AppointmentDetailView() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    setError(null);
    try {
      const { appointment: row } = await getAppointment(params.id);
      setAppointment(row);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load appointment.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useLoadWhen(Boolean(user && params.id), load);

  async function handleCancel() {
    if (!appointment) return;
    setCancelling(true);
    try {
      const { appointment: updated } = await cancelAppointment(appointment.id);
      setAppointment(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not cancel appointment.");
    } finally {
      setCancelling(false);
    }
  }

  if (!user) return null;

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <button
          type="button"
          onClick={() => router.push(ROUTES.appointments)}
          className="text-sm text-muted transition hover:text-foreground"
        >
          ← Back to appointments
        </button>

        {loading ? <LoadingBlock label="Loading appointment…" /> : null}
        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

        {appointment && !loading ? (
          <article className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-3xl tracking-tight">{appointment.service}</h1>
              <StatusBadge status={appointment.status} />
            </div>

            <dl className="mt-8 space-y-4 text-sm">
              <div className="flex justify-between gap-4 border-b border-line pb-3">
                <dt className="text-muted">Date</dt>
                <dd>{formatAppointmentDate(appointment.startTime)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-line pb-3">
                <dt className="text-muted">Time</dt>
                <dd>
                  {formatAppointmentTime(appointment.startTime)} –{" "}
                  {formatAppointmentTime(appointment.endTime)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-line pb-3">
                <dt className="text-muted">Duration</dt>
                <dd>{appointment.durationMin} minutes</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-line pb-3">
                <dt className="text-muted">
                  {user.role === "CUSTOMER" ? "Business" : "Customer"}
                </dt>
                <dd className="text-right">
                  {user.role === "CUSTOMER"
                    ? appointment.businessName
                    : `${appointment.customerName} (${appointment.customerEmail})`}
                </dd>
              </div>
              {appointment.notes ? (
                <div className="flex justify-between gap-4 border-b border-line pb-3">
                  <dt className="text-muted">Notes</dt>
                  <dd className="max-w-xs text-right">{appointment.notes}</dd>
                </div>
              ) : null}
            </dl>

            <div className="mt-8 flex flex-wrap gap-3">
              {isActiveStatus(appointment.status) ? (
                <Button
                  variant="secondary"
                  className="text-danger"
                  disabled={cancelling}
                  onClick={() => void handleCancel()}
                >
                  {cancelling ? "Cancelling…" : "Cancel appointment"}
                </Button>
              ) : null}
              <Link href={ROUTES.calendar}>
                <Button variant="ghost">View calendar</Button>
              </Link>
            </div>
          </article>
        ) : null}
      </div>
    </AppShell>
  );
}
