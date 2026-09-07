import Link from "next/link";
import { ROUTES } from "@/constants";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p className="font-display text-base text-foreground">BooklyAI</p>
        <div className="flex gap-4">
          <Link href={ROUTES.home} className="hover:text-foreground">
            Home
          </Link>
          <Link href={ROUTES.assistant} className="hover:text-foreground">
            Assistant
          </Link>
        </div>
      </div>
    </footer>
  );
}
