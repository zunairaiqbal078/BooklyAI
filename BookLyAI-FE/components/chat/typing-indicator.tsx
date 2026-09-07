export function TypingIndicator() {
  return (
    <div
      className="animate-message-in flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-muted"
      aria-live="polite"
    >
      <span className="sr-only">Assistant is thinking</span>
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted" />
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted" style={{ animationDelay: "0.15s" }} />
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted" style={{ animationDelay: "0.3s" }} />
      <span className="ml-1 text-xs">Thinking…</span>
    </div>
  );
}
