const features = [
  {
    title: "Conversational booking",
    body: "Ask for tomorrow afternoon or next Monday. The assistant gathers what it needs and never invents open slots.",
  },
  {
    title: "Real availability",
    body: "Every time offered comes from your business hours and booked calendar — conflict-free by design.",
  },
  {
    title: "Fallback when needed",
    body: "If a request is ambiguous, a structured form appears in the chat so customers never get stuck.",
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="scroll-mt-24 border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Features</p>
          <h2 className="mt-3 font-display text-3xl tracking-tight text-foreground sm:text-4xl">
            Built for calm, confident scheduling.
          </h2>
          <p className="mt-4 text-base leading-7 text-muted">
            BooklyAI keeps conversation delightful and business logic strict — so bookings stay accurate.
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="border-t border-line pt-6">
              <h3 className="text-lg font-medium text-foreground">{feature.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted">{feature.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
