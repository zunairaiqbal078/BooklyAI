import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  children?: ReactNode;
}

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  children,
}: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-12 text-center">
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">{description}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="mt-6 inline-flex">
          <Button className="h-10 px-5">{actionLabel}</Button>
        </Link>
      ) : null}
      {children}
    </div>
  );
}
