import { Button } from "@/components/ui/button";
import type { ChatMessageMeta } from "@/features/chat/api";
import { formatClockTime } from "@/lib/datetime";

type ConfirmationMeta = Extract<ChatMessageMeta, { type: "confirmation" }>;

interface ConfirmationCardProps {
  draft: ConfirmationMeta["draft"];
  onConfirm: () => void;
  onChangeTime: () => void;
  disabled?: boolean;
}

export function ConfirmationCard({
  draft,
  onConfirm,
  onChangeTime,
  disabled,
}: ConfirmationCardProps) {
  return (
    <div className="mt-3 rounded-2xl border border-accent/25 bg-surface px-4 py-4 shadow-[0_12px_40px_-28px_rgba(15,76,69,0.5)]">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">
        Confirm appointment
      </p>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Service</dt>
          <dd className="font-medium">{draft.serviceName ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Date</dt>
          <dd className="font-medium">{draft.date ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Time</dt>
          <dd className="font-medium">
            {draft.time ? formatClockTime(draft.time) : "—"}
          </dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" disabled={disabled} className="h-9 px-4 text-xs" onClick={onConfirm}>
          Confirm booking
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          className="h-9 px-4 text-xs"
          onClick={onChangeTime}
        >
          Pick another time
        </Button>
      </div>
    </div>
  );
}
