interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
  prompts: readonly string[];
}

export function SuggestedPrompts({ onSelect, disabled, prompts }: SuggestedPromptsProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
        Suggested prompts
      </p>
      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(prompt)}
            className="rounded-full border border-line bg-surface px-3.5 py-2 text-left text-sm text-foreground transition hover:border-accent/40 hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
