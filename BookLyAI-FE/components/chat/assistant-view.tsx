"use client";

import { useCallback, useEffect, useRef } from "react";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatMessageBubble } from "@/components/chat/chat-message-bubble";
import { SuggestedPrompts } from "@/components/chat/suggested-prompts";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import {
  bookFromFallbackForm,
  sendChatMessage,
  type ChatMessageDto,
} from "@/features/chat/api";
import { useAuth } from "@/features/auth/auth-provider";
import { useChatStore } from "@/stores/chat.store";
import { ApiError } from "@/types";
import Link from "next/link";
import { ROUTES } from "@/constants";

export function AssistantView() {
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const {
    sessionId,
    messages,
    isThinking,
    error,
    lastFailedMessage,
    setSessionId,
    appendMessages,
    setThinking,
    setError,
    setLastFailedMessage,
    reset,
  } = useChatStore();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isThinking]);

  const send = useCallback(
    async (text: string) => {
      setError(null);
      setLastFailedMessage(null);
      setThinking(true);

      const optimisticUser: ChatMessageDto = {
        id: `local-user-${Date.now()}`,
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
        metadata: { type: "text" },
      };
      appendMessages([optimisticUser]);

      try {
        const result = await sendChatMessage({
          sessionId: sessionId ?? undefined,
          message: text,
        });
        setSessionId(result.sessionId);
        // Replace optimistic user bubble with server versions
        useChatStore.setState((state) => ({
          messages: [
            ...state.messages.filter((m) => m.id !== optimisticUser.id),
            result.userMessage,
            result.assistantMessage,
          ],
        }));
      } catch (err) {
        useChatStore.setState((state) => ({
          messages: state.messages.filter((m) => m.id !== optimisticUser.id),
        }));
        setLastFailedMessage(text);
        setError(err instanceof ApiError ? err.message : "Could not reach the assistant.");
      } finally {
        setThinking(false);
      }
    },
    [
      appendMessages,
      sessionId,
      setError,
      setLastFailedMessage,
      setSessionId,
      setThinking,
    ],
  );

  async function handleFallbackSubmit(input: {
    sessionId?: string;
    businessId: string;
    serviceId: string;
    date: string;
    time: string;
  }) {
    setThinking(true);
    setError(null);
    try {
      const result = await bookFromFallbackForm(input);
      setSessionId(result.sessionId);
      appendMessages([result.userMessage, result.assistantMessage]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Booking failed.");
      throw err;
    } finally {
      setThinking(false);
    }
  }

  if (!user) return null;

  if (user.role === "BUSINESS") {
    return (
      <AppShell>
        <div className="mx-auto max-w-lg rounded-2xl border border-line bg-surface px-8 py-12 text-center">
          <h1 className="font-display text-3xl tracking-tight">Assistant is for customers</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Business accounts manage bookings from the calendar and appointments pages.
          </p>
          <div className="mt-7 flex justify-center gap-3">
            <Link href={ROUTES.calendar}>
              <Button>Open calendar</Button>
            </Link>
            <Link href={ROUTES.appointments}>
              <Button variant="secondary">Appointments</Button>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell dense hideFooter>
      <div className="mx-auto flex h-[calc(100dvh-10.5rem)] max-w-3xl flex-col sm:h-[calc(100dvh-9rem)]">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Assistant</p>
            <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
              Book with conversation
            </h1>
            <p className="mt-2 text-sm text-muted">
              Availability always comes from the calendar — never invented by the model.
            </p>
          </div>
          {messages.length > 0 ? (
            <Button
              variant="ghost"
              className="h-9 shrink-0 px-3 text-xs"
              onClick={() => reset()}
            >
              New chat
            </Button>
          ) : null}
        </header>

        <div className="flex min-h-0 flex-1 flex-col rounded-[1.5rem] border border-line bg-surface/70">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5">
            {messages.length === 0 && !isThinking ? (
              <div className="space-y-6 py-4">
                <div className="rounded-2xl border border-dashed border-line bg-background px-5 py-8 text-center">
                  <p className="font-display text-2xl tracking-tight">How can I help you book?</p>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
                    Ask in plain language, pick a real slot, and confirm. If anything is unclear,
                    a form appears so you never get stuck.
                  </p>
                </div>
                <SuggestedPrompts disabled={isThinking} onSelect={(prompt) => void send(prompt)} />
              </div>
            ) : null}

            {messages.map((message) => (
              <ChatMessageBubble
                key={message.id}
                message={message}
                sessionId={sessionId}
                busy={isThinking}
                onPickSlot={(slot) => void send(slot)}
                onConfirm={() => void send("Yes, confirm it")}
                onChangeTime={() => void send("Show me other available times")}
                onFallbackSubmit={handleFallbackSubmit}
              />
            ))}

            {isThinking ? <TypingIndicator /> : null}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-line px-3 py-3 sm:px-4">
            {error ? (
              <div className="mb-3">
                <ErrorState
                  message={error}
                  onRetry={
                    lastFailedMessage
                      ? () => {
                          const retry = lastFailedMessage;
                          void send(retry);
                        }
                      : undefined
                  }
                />
              </div>
            ) : null}
            <ChatComposer disabled={isThinking} onSend={(message) => void send(message)} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
