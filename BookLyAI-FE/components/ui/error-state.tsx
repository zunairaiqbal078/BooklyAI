import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-danger/20 bg-red-50 px-6 py-8 text-center"
    >
      <h3 className="text-base font-medium text-danger">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-danger/80">{message}</p>
      {onRetry ? (
        <Button variant="secondary" className="mt-5 h-10" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
