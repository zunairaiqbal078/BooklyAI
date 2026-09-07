interface BusinessSummaryCardProps {
  summary: {
    total: number;
    upcoming: number;
    today: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    paidCount: number;
    paidRevenueCents: number;
  };
}

export function BusinessSummaryCard({ summary }: BusinessSummaryCardProps) {
  const items = [
    { label: "Total", value: summary.total },
    { label: "Upcoming", value: summary.upcoming },
    { label: "Today", value: summary.today },
    { label: "Confirmed", value: summary.confirmed },
    { label: "Pending", value: summary.pending },
    { label: "Completed / paid", value: summary.paidCount },
    { label: "Cancelled", value: summary.cancelled },
  ];

  return (
    <div className="mt-3 rounded-2xl border border-line bg-background p-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Account summary</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border border-line/80 px-3 py-2">
            <p className="text-[11px] text-muted">{item.label}</p>
            <p className="mt-1 font-display text-xl tracking-tight">{item.value}</p>
          </div>
        ))}
      </div>
      {summary.paidRevenueCents > 0 ? (
        <p className="mt-3 text-xs text-muted">
          Listed revenue from completed visits: ${(summary.paidRevenueCents / 100).toFixed(0)}
          <span className="text-muted"> (payments module not live yet)</span>
        </p>
      ) : null}
    </div>
  );
}
