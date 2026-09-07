import Link from "next/link";
import type { ReactNode } from "react";
import { ROUTES } from "@/constants";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  panelTitle: string;
  panelBody: string;
}

export function AuthShell({ title, subtitle, children, panelTitle, panelBody }: AuthShellProps) {
  return (
    <div className="grid min-h-full flex-1 lg:grid-cols-2">
      <aside className="auth-panel relative hidden overflow-hidden text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link href={ROUTES.home} className="font-display text-3xl tracking-tight">
          BooklyAI
        </Link>
        <div className="max-w-md">
          <p className="font-display text-4xl leading-tight tracking-tight">{panelTitle}</p>
          <p className="mt-5 text-base leading-7 text-white/75">{panelBody}</p>
        </div>
        <p className="text-sm text-white/55">Secure sessions via HttpOnly cookies.</p>
      </aside>

      <div className="flex flex-col bg-background">
        <div className="flex items-center justify-between px-6 py-5 lg:px-10">
          <Link href={ROUTES.home} className="font-display text-xl tracking-tight lg:hidden">
            BooklyAI
          </Link>
          <Link href={ROUTES.home} className="ml-auto text-sm text-muted transition hover:text-foreground">
            Back to home
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-16 pt-6 sm:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">BooklyAI</p>
          <h1 className="mt-3 font-display text-4xl tracking-tight text-foreground">{title}</h1>
          <p className="mt-3 mb-8 text-sm leading-6 text-muted sm:text-base sm:leading-7">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
