"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { ROUTES } from "@/constants";
import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";

export function MobileAppNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const links = useMemo(() => {
    if (!user) return [];
    if (user.role === "CUSTOMER") {
      return [
        { href: ROUTES.explore, label: "Explore" },
        { href: ROUTES.dashboard, label: "Home" },
        { href: ROUTES.assistant, label: "AI" },
        { href: ROUTES.appointments, label: "Bookings" },
      ];
    }
    return [
      { href: ROUTES.dashboard, label: "Home" },
      { href: ROUTES.catalog, label: "Catalog" },
      { href: ROUTES.appointments, label: "Bookings" },
      { href: ROUTES.calendar, label: "Calendar" },
    ];
  }, [user]);

  if (!user || links.length === 0) return null;

  return (
    <nav
      aria-label="Mobile app"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md md:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-4 gap-1 px-2 py-2">
        {links.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-xl px-2 py-2 text-center text-xs font-medium transition",
                active ? "bg-accent-soft text-accent" : "text-muted hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
