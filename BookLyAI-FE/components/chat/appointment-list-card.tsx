import Link from "next/link";
import { StatusBadge } from "@/components/ui/status-badge";
import type { AppointmentDetail } from "@/features/appointments/api";
import { ROUTES } from "@/constants";
import { formatAppointmentDate, formatAppointmentTime } from "@/lib/datetime";

export function AppointmentListCard({ appointments }: { appointments: AppointmentDetail[] }) {
  if (appointments.length === 0) {
    return (
      <div className="mt-3 rounded-2xl border border-dashed border-line bg-background px-4 py-5 text-sm text-muted">
        No upcoming appointments yet.
      </div>
    );
  }

  return (
    <ul className="mt-3 space-y-2">
      {appointments.map((appointment) => (
        <li key={appointment.id}>
          <Link
            href={`${ROUTES.appointments}/${appointment.id}`}
            className="block rounded-2xl border border-line bg-background px-4 py-3 transition hover:border-accent/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{appointment.service}</p>
                <p className="mt-1 text-xs text-muted">
                  {formatAppointmentDate(appointment.startTime)} ·{" "}
                  {formatAppointmentTime(appointment.startTime)}
                </p>
              </div>
              <StatusBadge status={appointment.status} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
