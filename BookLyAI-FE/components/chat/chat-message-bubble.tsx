import { AppointmentListCard } from "@/components/chat/appointment-list-card";
import { AppointmentResultCard } from "@/components/chat/appointment-result-card";
import { BusinessSummaryCard } from "@/components/chat/business-summary-card";
import { ChatFallbackForm } from "@/components/chat/chat-fallback-form";
import { ConfirmationCard } from "@/components/chat/confirmation-card";
import { SlotPickerCard } from "@/components/chat/slot-picker-card";
import type { ChatMessageDto } from "@/features/chat/api";
import { cn } from "@/lib/utils";

interface ChatMessageBubbleProps {
  message: ChatMessageDto;
  sessionId: string | null;
  busy?: boolean;
  onPickSlot: (slot: string) => void;
  onConfirm: () => void;
  onChangeTime: () => void;
  onFallbackSubmit: (input: {
    sessionId?: string;
    businessId: string;
    serviceId: string;
    date: string;
    time: string;
  }) => Promise<void>;
}

export function ChatMessageBubble({
  message,
  sessionId,
  busy,
  onPickSlot,
  onConfirm,
  onChangeTime,
  onFallbackSubmit,
}: ChatMessageBubbleProps) {
  const isUser = message.role === "user";
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className={cn("animate-message-in flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[92%] sm:max-w-[80%]", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-6",
            isUser
              ? "bg-accent text-white"
              : "border border-line bg-surface text-foreground",
          )}
        >
          {message.content}
        </div>
        <p className={cn("mt-1.5 text-[11px] text-muted", isUser ? "text-right" : "text-left")}>
          {time}
        </p>

        {!isUser && message.metadata?.type === "slots" ? (
          <SlotPickerCard
            date={message.metadata.date}
            slots={message.metadata.slots}
            disabled={busy}
            onSelect={onPickSlot}
          />
        ) : null}

        {!isUser && message.metadata?.type === "confirmation" ? (
          <ConfirmationCard
            draft={message.metadata.draft}
            disabled={busy}
            onConfirm={onConfirm}
            onChangeTime={onChangeTime}
          />
        ) : null}

        {!isUser && message.metadata?.type === "appointment" ? (
          <AppointmentResultCard appointment={message.metadata.appointment} />
        ) : null}

        {!isUser && message.metadata?.type === "appointment_list" ? (
          <AppointmentListCard appointments={message.metadata.appointments} />
        ) : null}

        {!isUser && message.metadata?.type === "business_summary" ? (
          <BusinessSummaryCard summary={message.metadata.summary} />
        ) : null}

        {!isUser && message.metadata?.type === "fallback_form" ? (
          <ChatFallbackForm
            form={message.metadata.form}
            sessionId={sessionId}
            disabled={busy}
            onSubmit={onFallbackSubmit}
          />
        ) : null}
      </div>
    </div>
  );
}
