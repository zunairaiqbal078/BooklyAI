import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import type { AppointmentDetail } from "@/features/appointments/api";
import { ROUTES } from "@/constants";
import { formatAppointmentDate, formatAppointmentTime } from "@/lib/datetime";

export function AppointmentResultCard({ appointment }: { appointment: AppointmentDetail }) {
  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-accent/25 bg-accent-soft/60">
      <div className="border-b border-accent/15 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">
          Appointment confirmed
        </p>
      </div>
      <div className="space-y-3 px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-foreground">{appointment.service}</p>
          <StatusBadge status={appointment.status} />
        </div>
        <p className="text-sm text-muted">
          {formatAppointmentDate(appointment.startTime)} ·{" "}
          {formatAppointmentTime(appointment.startTime)}
        </p>
        <p className="text-sm text-muted">{appointment.businessName}</p>
        <Link href={`${ROUTES.appointments}/${appointment.id}`}>
          <Button variant="secondary" className="h-9 px-3 text-xs">
            View details
          </Button>
        </Link>
      </div>
    </div>
  );
}
