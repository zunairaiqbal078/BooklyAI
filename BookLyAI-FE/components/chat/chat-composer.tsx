"use client";

import { type FormEvent, type KeyboardEvent, useState } from "react";
import { Button } from "@/components/ui/button";

interface ChatComposerProps {
  disabled?: boolean;
  placeholder?: string;
  onSend: (message: string) => void;
}

export function ChatComposer({
  disabled,
  placeholder = "Ask to book, check availability, or list appointments…",
  onSend,
}: ChatComposerProps) {
  const [value, setValue] = useState("");

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 rounded-2xl border border-line bg-surface p-2 shadow-[0_12px_40px_-28px_rgba(15,76,69,0.45)]"
    >
      <label htmlFor="chat-input" className="sr-only">
        Message
      </label>
      <textarea
        id="chat-input"
        rows={1}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted disabled:opacity-60"
      />
      <Button type="submit" disabled={disabled || !value.trim()} className="h-11 shrink-0 px-4">
        Send
      </Button>
    </form>
  );
}
