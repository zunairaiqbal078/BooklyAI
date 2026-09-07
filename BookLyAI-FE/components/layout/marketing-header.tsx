"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants";
import { useAuth } from "@/features/auth/auth-provider";

export function MarketingHeader() {
  const { user, isLoading, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <Link href={ROUTES.home} className="font-display text-2xl tracking-tight text-foreground">
          BooklyAI
        </Link>

        <nav aria-label="Marketing" className="hidden items-center gap-8 text-sm text-muted md:flex">
          <Link href={ROUTES.explore} className="transition hover:text-foreground">
            Explore
          </Link>
          <a href="#preview" className="transition hover:text-foreground">
            Product
          </a>
          <a href="#features" className="transition hover:text-foreground">
            Features
          </a>
          <a href="#workflow" className="transition hover:text-foreground">
            How it works
          </a>
        </nav>

        <div className="flex items-center gap-2">
          {isLoading ? (
            <span className="text-xs text-muted">…</span>
          ) : user ? (
            <>
              <Link
                href={ROUTES.dashboard}
                className="hidden max-w-[10rem] truncate text-sm text-muted sm:inline hover:text-foreground"
              >
                {user.name}
              </Link>
              <Link href={ROUTES.explore}>
                <Button variant="secondary" className="h-10 px-4">
                  Explore
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="h-10 px-4"
                onClick={() => void logout()}
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href={ROUTES.login} className="hidden sm:block">
                <Button variant="ghost" className="h-10 px-4">
                  Log in
                </Button>
              </Link>
              <Link href={ROUTES.signup}>
                <Button className="h-10 px-4">Get started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
