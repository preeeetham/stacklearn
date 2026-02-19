import { create } from "zustand";
import type { ChatMessage, PlaygroundConfig } from "../types";

interface ChatState {
    messages: ChatMessage[];
    isLoading: boolean;
    selectedModel: string;
    error: string | null;

    addMessage: (message: ChatMessage) => void;
    updateLastAssistantMessage: (
        updater: (msg: ChatMessage) => ChatMessage
    ) => void;
    setLoading: (loading: boolean) => void;
    setModel: (model: string) => void;
    setError: (error: string | null) => void;
    clearMessages: () => void;
}

const getStoredModel = (): string => {
    try {
        return localStorage.getItem("stacklearn-model") || "anthropic/claude-3.5-sonnet";
    } catch {
        return "anthropic/claude-3.5-sonnet";
    }
};

export const useChatStore = create<ChatState>((set) => ({
    messages: [],
    isLoading: false,
    selectedModel: getStoredModel(),
    error: null,

    addMessage: (message) =>
        set((state) => ({
            messages: [...state.messages, message],
            error: null,
        })),

    updateLastAssistantMessage: (updater) =>
        set((state) => {
            const messages = [...state.messages];
            for (let i = messages.length - 1; i >= 0; i--) {
                if (messages[i].role === "assistant") {
                    messages[i] = updater(messages[i]);
                    break;
                }
            }
            return { messages };
        }),

    setLoading: (loading) => set({ isLoading: loading }),

    setModel: (model) => {
        try {
            localStorage.setItem("stacklearn-model", model);
        } catch {
            // ignore
        }
        set({ selectedModel: model });
    },

    setError: (error) => set({ error }),

    clearMessages: () => set({ messages: [], error: null }),
}));
