import { Button } from "@/components/ui/button";

interface SlotPickerCardProps {
  date: string;
  slots: string[];
  onSelect: (slot: string) => void;
  disabled?: boolean;
}

export function SlotPickerCard({ date, slots, onSelect, disabled }: SlotPickerCardProps) {
  return (
    <div className="mt-3 rounded-2xl border border-line bg-background px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
        Available on {date}
      </p>
      {slots.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No open slots for this day.</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {slots.map((slot) => (
            <Button
              key={slot}
              type="button"
              variant="secondary"
              disabled={disabled}
              className="h-9 px-3 text-xs"
              onClick={() => onSelect(slot)}
            >
              {slot}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
