import { useCallback } from "react";
import { useChatStore } from "../store/chatStore";
import { usePlaygroundStore } from "../store/playgroundStore";
import { streamChat } from "../lib/sse";
import { createSmoothStreamer } from "../lib/smoothStream";
import type { ChatMessage } from "../types";

let messageIdCounter = 0;
function generateId(): string {
    return `msg-${Date.now()}-${++messageIdCounter}`;
}

export function useChat() {
    const {
        messages,
        isLoading,
        selectedModel,
        error,
        addMessage,
        updateLastAssistantMessage,
        setLoading,
        setError,
        clearMessages,
    } = useChatStore();

    const setConfig = usePlaygroundStore((s) => s.setConfig);

    const sendMessage = useCallback(
        async (content: string) => {
            if (!content.trim() || isLoading) return;

            // Add user message
            const userMsg: ChatMessage = {
                id: generateId(),
                role: "user",
                content: content.trim(),
            };
            addMessage(userMsg);

            // Add placeholder assistant message
            const assistantMsg: ChatMessage = {
                id: generateId(),
                role: "assistant",
                content: "",
                toolCalls: [],
                isStreaming: true,
            };
            addMessage(assistantMsg);
            setLoading(true);
            setError(null);

            // Reveal streamed text at a smooth, adaptive typewriter pace rather
            // than in the large bursts the model sends.
            const streamer = createSmoothStreamer({
                onReveal: (chunk) => {
                    updateLastAssistantMessage((msg) => ({
                        ...msg,
                        content: msg.content + chunk,
                    }));
                },
                onComplete: () => {
                    updateLastAssistantMessage((msg) => ({
                        ...msg,
                        isStreaming: false,
                    }));
                    setLoading(false);
                },
            });

            try {
                const allMessages = [...messages, userMsg];

                await streamChat(allMessages, selectedModel, {
                    onText: (text) => {
                        streamer.push(text);
                    },
                    onToolCall: (tool, url, reason) => {
                        updateLastAssistantMessage((msg) => ({
                            ...msg,
                            toolCalls: [
                                ...(msg.toolCalls || []),
                                { tool, url, reason, status: "loading" as const },
                            ],
                        }));
                    },
                    onToolResult: (tool) => {
                        updateLastAssistantMessage((msg) => ({
                            ...msg,
                            toolCalls: (msg.toolCalls || []).map((tc) =>
                                tc.tool === tool && tc.status === "loading"
                                    ? { ...tc, status: "done" as const }
                                    : tc
                            ),
                        }));
                    },
                    onPlaygroundConfig: (config) => {
                        if (config) {
                            updateLastAssistantMessage((msg) => ({
                                ...msg,
                                playgroundConfig: config,
                            }));
                            setConfig(config);
                        }
                    },
                    onFollowUps: (questions) => {
                        updateLastAssistantMessage((msg) => ({
                            ...msg,
                            followUps: questions,
                        }));
                    },
                    onDone: () => {
                        // Let the typewriter drain the rest, then mark complete.
                        streamer.finish();
                    },
                    onError: (message) => {
                        streamer.cancel();
                        updateLastAssistantMessage((msg) => ({
                            ...msg,
                            isStreaming: false,
                            content: msg.content || `⚠️ Error: ${message}`,
                        }));
                        setLoading(false);
                        setError(message);
                    },
                });
            } catch (err) {
                streamer.cancel();
                const errMsg = err instanceof Error ? err.message : "Unknown error";
                updateLastAssistantMessage((msg) => ({
                    ...msg,
                    isStreaming: false,
                    content: msg.content || `⚠️ Error: ${errMsg}`,
                }));
                setLoading(false);
                setError(errMsg);
            }
        },
        [
            messages,
            isLoading,
            selectedModel,
            addMessage,
            updateLastAssistantMessage,
            setLoading,
            setError,
            setConfig,
        ]
    );

    return {
        messages,
        isLoading,
        error,
        sendMessage,
        clearMessages,
    };
}
