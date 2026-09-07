"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MobileAppNav } from "@/components/layout/mobile-app-nav";
import { Button } from "@/components/ui/button";
import { LoadingBlock } from "@/components/ui/loading-block";
import { ROUTES } from "@/constants";
import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  dense = false,
  hideFooter = false,
}: {
  children: ReactNode;
  dense?: boolean;
  hideFooter?: boolean;
}) {
  const { user, isLoading } = useAuth();

  return (
    <>
      <SiteHeader />
      <main
        className={cn(
          "mx-auto w-full max-w-6xl flex-1 px-6",
          dense ? "py-4 sm:py-6" : "py-10 sm:py-12",
          "pb-24 md:pb-10",
        )}
      >
        {isLoading ? (
          <LoadingBlock label="Checking your session…" />
        ) : !user ? (
          <div className="mx-auto max-w-lg rounded-2xl border border-line bg-surface px-8 py-12 text-center">
            <h1 className="font-display text-3xl tracking-tight">Sign in to continue</h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              Your dashboard, calendar, and appointments are available after you log in.
            </p>
            <div className="mt-7 flex justify-center gap-3">
              <Link href={ROUTES.login}>
                <Button>Log in</Button>
              </Link>
              <Link href={ROUTES.signup}>
                <Button variant="secondary">Create account</Button>
              </Link>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
      {!hideFooter ? <div className="hidden md:block"><SiteFooter /></div> : null}
      <MobileAppNav />
    </>
  );
}
