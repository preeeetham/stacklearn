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

// NVIDIA NIM's Nemotron 3 Ultra is the default; the server's /api/models
// response can override it (see useModels). The storage key was bumped from
// "stacklearn-model" so returning visitors move off the old Groq default.
export const DEFAULT_MODEL = "nvidia/nemotron-3-ultra-550b-a55b";
const MODEL_STORAGE_KEY = "stacklearn-model-v2";

const getStoredModel = (): string => {
    try {
        return localStorage.getItem(MODEL_STORAGE_KEY) || DEFAULT_MODEL;
    } catch {
        return DEFAULT_MODEL;
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
            localStorage.setItem(MODEL_STORAGE_KEY, model);
        } catch {
            // ignore
        }
        set({ selectedModel: model });
    },

    setError: (error) => set({ error }),

    clearMessages: () => set({ messages: [], error: null }),
}));
