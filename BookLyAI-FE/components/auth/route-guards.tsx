"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { LoadingBlock } from "@/components/ui/loading-block";
import { ROUTES } from "@/constants";
import { useAuth } from "@/features/auth/auth-provider";

/** Protected app pages — unauthenticated / expired session → landing `/`. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(ROUTES.home);
    }
  }, [isLoading, user, router, pathname]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
        <LoadingBlock label="Checking your session…" />
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}

/** Login/signup — already signed in → dashboard (or onboarding). */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !user) return;
    const target =
      user.role === "BUSINESS" && user.onboardingComplete === false
        ? ROUTES.onboarding
        : ROUTES.dashboard;
    router.replace(target);
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
        <LoadingBlock label="Checking your session…" />
      </div>
    );
  }

  if (user) return null;
  return <>{children}</>;
}
