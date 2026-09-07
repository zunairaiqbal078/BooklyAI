"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/constants";
import { cn } from "@/lib/utils";

const links = [
  { href: ROUTES.dashboard, label: "Home" },
  { href: ROUTES.assistant, label: "AI" },
  { href: ROUTES.appointments, label: "Bookings" },
  { href: ROUTES.calendar, label: "Calendar" },
];

export function MobileAppNav() {
  const pathname = usePathname();

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
