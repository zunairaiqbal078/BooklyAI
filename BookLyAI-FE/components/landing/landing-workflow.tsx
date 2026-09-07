const steps = [
  {
    step: "01",
    title: "Describe what you need",
    body: "Say it the way you’d text a friend — day, service, and rough time.",
  },
  {
    step: "02",
    title: "Pick a real slot",
    body: "BooklyAI shows open times from the calendar, not guesses from the model.",
  },
  {
    step: "03",
    title: "Confirm and done",
    body: "Approve the booking and get a clear confirmation — businesses stay free of overlaps.",
  },
];

export function LandingWorkflow() {
  return (
    <section id="workflow" className="scroll-mt-24 border-t border-line">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">How it works</p>
          <h2 className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">
            Three steps from request to confirmed appointment.
          </h2>
        </div>

        <ol className="mt-12 grid gap-10 md:grid-cols-3">
          {steps.map((item) => (
            <li key={item.step}>
              <p className="font-mono text-xs tracking-wider text-accent">{item.step}</p>
              <h3 className="mt-3 text-lg font-medium">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted">{item.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
