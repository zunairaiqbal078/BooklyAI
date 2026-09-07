import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import type { AppointmentDetail } from "@/features/appointments/api";
import { formatAppointmentDate, formatAppointmentTime, isActiveStatus } from "@/lib/datetime";
import { ROUTES } from "@/constants";
import { cn } from "@/lib/utils";

interface AppointmentCardProps {
  appointment: AppointmentDetail;
  perspective: "CUSTOMER" | "BUSINESS";
  onCancel?: (id: string) => void;
  cancellingId?: string | null;
  compact?: boolean;
}

export function AppointmentCard({
  appointment,
  perspective,
  onCancel,
  cancellingId,
  compact = false,
}: AppointmentCardProps) {
  const canCancel = isActiveStatus(appointment.status) && onCancel;

  return (
    <article
      className={cn(
        "rounded-2xl border border-line bg-surface px-5 py-4 transition hover:border-accent/30",
        compact ? "py-3" : "sm:px-6 sm:py-5",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-medium text-foreground">
              {appointment.service}
            </h3>
            <StatusBadge status={appointment.status} />
          </div>
          <p className="text-sm text-muted">
            {formatAppointmentDate(appointment.startTime)} ·{" "}
            {formatAppointmentTime(appointment.startTime)}
            {" – "}
            {formatAppointmentTime(appointment.endTime)}
          </p>
          <p className="text-sm text-muted">
            {perspective === "CUSTOMER"
              ? appointment.businessName
              : `${appointment.customerName} · ${appointment.customerEmail}`}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href={`${ROUTES.appointments}/${appointment.id}`}>
            <Button variant="secondary" className="h-9 px-3 text-xs">
              Details
            </Button>
          </Link>
          {canCancel ? (
            <Button
              variant="ghost"
              className="h-9 px-3 text-xs text-danger hover:bg-red-50"
              disabled={cancellingId === appointment.id}
              onClick={() => onCancel(appointment.id)}
            >
              {cancellingId === appointment.id ? "Cancelling…" : "Cancel"}
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
