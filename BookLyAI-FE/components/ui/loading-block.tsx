import { cn } from "@/lib/utils";

export function LoadingBlock({ className, label = "Loading…" }: { className?: string; label?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-2xl border border-line bg-surface px-6 py-16 text-sm text-muted",
        className,
      )}
      aria-busy="true"
      aria-live="polite"
    >
      {label}
    </div>
  );
}

export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="h-24 animate-pulse rounded-2xl border border-line bg-surface"
        />
      ))}
    </div>
  );
}
