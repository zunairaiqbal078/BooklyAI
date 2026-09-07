import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChatPreview } from "@/components/landing/chat-preview";
import { ROUTES } from "@/constants";

export function LandingHero() {
  return (
    <section className="marketing-glow relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl gap-14 px-6 pb-20 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10 lg:pb-28 lg:pt-20">
        <div className="animate-fade-up">
          <p className="font-display text-5xl tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            BooklyAI
          </p>
          <h1 className="mt-5 max-w-xl text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl">
            Book appointments naturally using AI.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted sm:text-lg sm:leading-8">
            Talk to an assistant that understands your schedule request, offers real availability,
            and confirms the booking — or use a simple form when you prefer.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={ROUTES.signup}>
              <Button className="h-12 px-6 text-sm">Start booking</Button>
            </Link>
            <Link href={ROUTES.login}>
              <Button variant="secondary" className="h-12 px-6 text-sm">
                Log in
              </Button>
            </Link>
          </div>
        </div>

        <div id="preview" className="animate-fade-up scroll-mt-24" style={{ animationDelay: "120ms" }}>
          <ChatPreview />
        </div>
      </div>
    </section>
  );
}
