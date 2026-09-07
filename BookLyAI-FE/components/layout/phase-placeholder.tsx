interface PhasePlaceholderProps {
  title: string;
  phase: string;
  description: string;
}

export function PhasePlaceholder({ title, phase, description }: PhasePlaceholderProps) {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-20">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">{phase}</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight text-foreground">{title}</h1>
      <p className="mt-4 max-w-lg text-base leading-7 text-muted">{description}</p>
    </section>
  );
}
