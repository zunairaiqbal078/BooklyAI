import { create } from "zustand";
import type { ChatMessageDto } from "@/features/chat/api";

interface ChatState {
  sessionId: string | null;
  messages: ChatMessageDto[];
  isLoading: boolean;
  isThinking: boolean;
  error: string | null;
  lastFailedMessage: string | null;
  setSessionId: (sessionId: string | null) => void;
  setMessages: (messages: ChatMessageDto[]) => void;
  appendMessages: (messages: ChatMessageDto[]) => void;
  setLoading: (isLoading: boolean) => void;
  setThinking: (isThinking: boolean) => void;
  setError: (error: string | null) => void;
  setLastFailedMessage: (message: string | null) => void;
  reset: () => void;
}

const initial = {
  sessionId: null as string | null,
  messages: [] as ChatMessageDto[],
  isLoading: false,
  isThinking: false,
  error: null as string | null,
  lastFailedMessage: null as string | null,
};

export const useChatStore = create<ChatState>((set) => ({
  ...initial,
  setSessionId: (sessionId) => set({ sessionId }),
  setMessages: (messages) => set({ messages }),
  appendMessages: (messages) =>
    set((state) => ({ messages: [...state.messages, ...messages] })),
  setLoading: (isLoading) => set({ isLoading }),
  setThinking: (isThinking) => set({ isThinking }),
  setError: (error) => set({ error }),
  setLastFailedMessage: (lastFailedMessage) => set({ lastFailedMessage }),
  reset: () => set(initial),
}));
