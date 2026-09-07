"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants";
import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";

const appLinks = [
  { href: ROUTES.dashboard, label: "Dashboard" },
  { href: ROUTES.assistant, label: "Assistant" },
  { href: ROUTES.appointments, label: "Appointments" },
  { href: ROUTES.calendar, label: "Calendar" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { user, logout, isLoading } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
        <Link href={ROUTES.home} className="font-display text-xl tracking-tight">
          BooklyAI
        </Link>

        <nav aria-label="App" className="hidden items-center gap-5 text-sm md:flex">
          {appLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "transition hover:text-foreground",
                pathname.startsWith(link.href) ? "text-foreground" : "text-muted",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isLoading ? (
            <span className="text-xs text-muted">…</span>
          ) : user ? (
            <>
              <span className="hidden text-sm text-muted sm:inline">{user.name}</span>
              <Button variant="secondary" className="h-9 px-3 text-xs" onClick={() => void logout()}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href={ROUTES.login}>
                <Button variant="ghost" className="h-9 px-3 text-xs">
                  Log in
                </Button>
              </Link>
              <Link href={ROUTES.signup}>
                <Button className="h-9 px-3 text-xs">Sign up</Button>
              </Link>
            </>
          )}
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-sm md:hidden"
            aria-expanded={open}
            aria-label="Toggle navigation"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "×" : "☰"}
          </button>
        </div>
      </div>

      {open ? (
        <nav
          aria-label="Mobile"
          className="border-t border-line bg-surface px-6 py-3 md:hidden"
        >
          <div className="flex flex-col gap-2">
            {appLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-xl px-3 py-2 text-sm transition",
                  pathname.startsWith(link.href)
                    ? "bg-accent-soft text-foreground"
                    : "text-muted hover:bg-background",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
