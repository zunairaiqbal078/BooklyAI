"use client";

const turns = [
  { role: "user" as const, text: "I need a consultation tomorrow afternoon.", delay: "0ms" },
  {
    role: "assistant" as const,
    text: "Sure. What type of consultation do you need?",
    delay: "120ms",
  },
  { role: "user" as const, text: "General consultation.", delay: "240ms" },
  {
    role: "assistant" as const,
    text: "I have 2:00 PM, 3:30 PM, and 5:00 PM available. Which time works for you?",
    delay: "360ms",
  },
  { role: "user" as const, text: "3:30 PM.", delay: "480ms" },
  {
    role: "assistant" as const,
    text: "Great. Would you like me to confirm your appointment for tomorrow at 3:30 PM?",
    delay: "600ms",
  },
];

export function ChatPreview() {
  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="absolute -inset-4 rounded-[2rem] bg-accent/10 blur-2xl" aria-hidden />
      <div className="relative overflow-hidden rounded-[1.75rem] border border-line bg-surface shadow-[0_24px_80px_-40px_rgba(15,76,69,0.45)]">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="text-sm font-medium text-foreground">BooklyAI Assistant</p>
            <p className="text-xs text-muted">Natural language booking</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Live
          </span>
        </div>

        <div className="space-y-3 px-5 py-5">
          {turns.map((turn) => (
            <div
              key={`${turn.role}-${turn.text}`}
              className={`animate-message-in flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}
              style={{ animationDelay: turn.delay }}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${
                  turn.role === "user"
                    ? "bg-accent text-white"
                    : "border border-line bg-background text-foreground"
                }`}
              >
                {turn.text}
              </div>
            </div>
          ))}

          <div className="flex items-center gap-1.5 pt-1 pl-1 text-muted">
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted" />
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted" style={{ animationDelay: "0.15s" }} />
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted" style={{ animationDelay: "0.3s" }} />
          </div>
        </div>

        <div className="border-t border-line px-5 py-4">
          <div className="flex items-center gap-3 rounded-full border border-line bg-background px-4 py-2.5 text-sm text-muted">
            Ask to book, reschedule, or check availability…
          </div>
        </div>
      </div>
    </div>
  );
}
