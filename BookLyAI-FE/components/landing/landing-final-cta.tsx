import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants";

export function LandingFinalCta() {
  return (
    <section className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="flex flex-col items-start justify-between gap-8 rounded-[2rem] bg-accent px-8 py-12 text-white sm:px-12 lg:flex-row lg:items-center">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
              Ready to book without the back-and-forth?
            </h2>
            <p className="mt-4 text-base leading-7 text-white/80">
              Create a free account as a customer or business and try the assistant in minutes.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={ROUTES.signup}>
              <Button className="h-12 bg-white px-6 text-accent hover:bg-white/90">
                Create account
              </Button>
            </Link>
            <Link href={ROUTES.login}>
              <Button
                variant="ghost"
                className="h-12 border border-white/25 px-6 text-white hover:bg-white/10"
              >
                Log in
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
