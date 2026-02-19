import type { SSEEvent, ChatMessage } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "";

/**
 * Send a chat request and process the SSE stream.
 */
export async function streamChat(
    messages: ChatMessage[],
    model: string,
    callbacks: {
        onText: (text: string) => void;
        onToolCall: (tool: string, url?: string, reason?: string) => void;
        onToolResult: (tool: string) => void;
        onPlaygroundConfig: (config: SSEEvent["config"]) => void;
        onDone: () => void;
        onError: (message: string) => void;
    }
): Promise<void> {
    const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            messages: messages.map((m) => ({
                role: m.role,
                content: m.content,
            })),
            model,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error ${response.status}: ${errorText}`);
    }

    if (!response.body) {
        throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith("data: ")) continue;

                const data = trimmed.slice(6);
                try {
                    const event = JSON.parse(data) as SSEEvent;

                    switch (event.type) {
                        case "text":
                            if (event.content) callbacks.onText(event.content);
                            break;
                        case "tool_call":
                            callbacks.onToolCall(event.tool || "", event.url, event.reason);
                            break;
                        case "tool_result":
                            callbacks.onToolResult(event.tool || "");
                            break;
                        case "playground_config":
                            callbacks.onPlaygroundConfig(event.config);
                            break;
                        case "done":
                            callbacks.onDone();
                            return;
                        case "error":
                            callbacks.onError(event.message || "Unknown error");
                            return;
                    }
                } catch {
                    // Skip malformed JSON
                }
            }
        }
    } finally {
        reader.releaseLock();
    }

    callbacks.onDone();
}
