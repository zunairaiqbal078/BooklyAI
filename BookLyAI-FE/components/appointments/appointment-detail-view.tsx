"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { LoadingBlock } from "@/components/ui/loading-block";
import { StatusBadge } from "@/components/ui/status-badge";
import { ROUTES } from "@/constants";
import {
  cancelAppointment,
  completeAppointment,
  createReview,
  getAppointment,
  requestReview,
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
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewDone, setReviewDone] = useState(false);

  const load = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    setError(null);
    try {
      const { appointment: row } = await getAppointment(params.id);
      setAppointment(row);
      setReviewDone(row.hasReview);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load appointment.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useLoadWhen(Boolean(user && params.id), load);

  async function runAction(action: () => Promise<{ appointment: AppointmentDetail }>) {
    setBusy(true);
    setError(null);
    try {
      const { appointment: updated } = await action();
      setAppointment(updated);
      setReviewDone(updated.hasReview);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitReview() {
    if (!appointment) return;
    setBusy(true);
    setError(null);
    try {
      await createReview(appointment.id, {
        rating,
        comment: comment.trim() || undefined,
      });
      setReviewDone(true);
      const { appointment: updated } = await getAppointment(appointment.id);
      setAppointment(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit review.");
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  const canComplete =
    user.role === "BUSINESS" &&
    appointment &&
    (appointment.status === "CONFIRMED" || appointment.status === "PENDING");

  const canRequestReview =
    user.role === "BUSINESS" &&
    appointment &&
    appointment.status === "COMPLETED" &&
    !appointment.reviewRequested &&
    !appointment.hasReview;

  const canLeaveReview =
    user.role === "CUSTOMER" &&
    appointment &&
    appointment.status === "COMPLETED" &&
    appointment.reviewRequested &&
    !reviewDone;

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
              {appointment.status === "COMPLETED" ? (
                <div className="flex justify-between gap-4 border-b border-line pb-3">
                  <dt className="text-muted">Review</dt>
                  <dd className="text-right">
                    {reviewDone
                      ? "Submitted"
                      : appointment.reviewRequested
                        ? "Requested"
                        : "Not requested"}
                  </dd>
                </div>
              ) : null}
            </dl>

            <div className="mt-8 flex flex-wrap gap-3">
              {isActiveStatus(appointment.status) ? (
                <Button
                  variant="secondary"
                  className="text-danger"
                  disabled={busy}
                  onClick={() => void runAction(() => cancelAppointment(appointment.id))}
                >
                  {busy ? "Working…" : "Cancel appointment"}
                </Button>
              ) : null}
              {canComplete ? (
                <Button
                  disabled={busy}
                  onClick={() => void runAction(() => completeAppointment(appointment.id))}
                >
                  Mark completed & request review
                </Button>
              ) : null}
              {canRequestReview ? (
                <Button
                  disabled={busy}
                  onClick={() => void runAction(() => requestReview(appointment.id))}
                >
                  Ask for review
                </Button>
              ) : null}
              <Link href={ROUTES.calendar}>
                <Button variant="ghost">View calendar</Button>
              </Link>
            </div>

            {canLeaveReview ? (
              <div className="mt-8 space-y-4 rounded-2xl border border-line bg-background p-5">
                <h2 className="font-display text-xl tracking-tight">Leave a review</h2>
                <p className="text-sm text-muted">
                  Share how {appointment.service} went — other customers can see it on the business
                  page.
                </p>
                <label className="block text-sm">
                  <span className="mb-1 block text-muted">Rating</span>
                  <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-3 text-sm"
                  >
                    {[5, 4, 3, 2, 1].map((value) => (
                      <option key={value} value={value}>
                        {value} star{value === 1 ? "" : "s"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-muted">Comment (optional)</span>
                  <Input
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="What went well?"
                    maxLength={1000}
                  />
                </label>
                <Button disabled={busy} onClick={() => void handleSubmitReview()}>
                  {busy ? "Submitting…" : "Submit review"}
                </Button>
              </div>
            ) : null}

            {user.role === "CUSTOMER" && reviewDone ? (
              <p className="mt-6 text-sm text-muted">
                Thanks — your review is visible on the{" "}
                <Link
                  href={ROUTES.business(appointment.businessSlug)}
                  className="text-accent hover:text-accent-hover"
                >
                  business page
                </Link>
                .
              </p>
            ) : null}
          </article>
        ) : null}
      </div>
    </AppShell>
  );
}
