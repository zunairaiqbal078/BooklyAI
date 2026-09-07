import Link from "next/link";
import { ROUTES } from "@/constants";

export function MarketingFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-xl tracking-tight">BooklyAI</p>
          <p className="mt-1 text-sm text-muted">Book appointments naturally using AI.</p>
        </div>
        <div className="flex flex-wrap gap-5 text-sm text-muted">
          <Link href={ROUTES.login} className="hover:text-foreground">
            Log in
          </Link>
          <Link href={ROUTES.signup} className="hover:text-foreground">
            Sign up
          </Link>
          <Link href={ROUTES.assistant} className="hover:text-foreground">
            Assistant
          </Link>
        </div>
      </div>
    </footer>
  );
}
