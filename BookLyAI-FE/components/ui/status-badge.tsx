import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/datetime";
import type { AppointmentStatus } from "@/types";

const styles: Record<AppointmentStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-200",
  CONFIRMED: "bg-accent-soft text-accent border-accent/20",
  CANCELLED: "bg-red-50 text-danger border-danger/20",
  COMPLETED: "bg-background text-muted border-line",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
        styles[status],
      )}
    >
      {statusLabel(status)}
    </span>
  );
}
