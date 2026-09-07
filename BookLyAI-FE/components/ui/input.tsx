import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-foreground outline-none transition duration-150 placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/15",
          className,
        )}
        {...props}
      />
    );
  },
);
