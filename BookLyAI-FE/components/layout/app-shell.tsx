"use client";

import type { ReactNode } from "react";
import { RequireAuth } from "@/components/auth/route-guards";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MobileAppNav } from "@/components/layout/mobile-app-nav";
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
  return (
    <RequireAuth>
      <SiteHeader />
      <main
        className={cn(
          "mx-auto w-full max-w-6xl flex-1 px-6",
          dense ? "py-4 sm:py-6" : "py-10 sm:py-12",
          "pb-24 md:pb-10",
        )}
      >
        {children}
      </main>
      {!hideFooter ? (
        <div className="hidden md:block">
          <SiteFooter />
        </div>
      ) : null}
      <MobileAppNav />
    </RequireAuth>
  );
}
