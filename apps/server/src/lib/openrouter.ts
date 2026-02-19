import type {
    OpenRouterMessage,
    OpenRouterStreamChunk,
    OpenRouterToolCall,
} from "../types/index.js";
import { TOOL_DEFINITIONS } from "../agent/prompts.js";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

interface StreamCallbacks {
    onTextChunk: (text: string) => void;
    onToolCall: (toolCall: OpenRouterToolCall) => void;
    onDone: (finishReason: string | null) => void;
    onError: (error: Error) => void;
}

/**
 * Create a streaming chat completion request to OpenRouter.
 * Returns an async generator that yields parsed chunks.
 */
export async function createChatCompletion(
    messages: OpenRouterMessage[],
    model: string,
    callbacks: StreamCallbacks,
    useTools: boolean = true
): Promise<void> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY is not set");
    }

    const body: Record<string, unknown> = {
        model,
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 8192,
    };
    if (useTools) {
        body.tools = TOOL_DEFINITIONS;
    }

    const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://stacklearn.dev",
            "X-Title": "StackLearn",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
            `OpenRouter API error ${response.status}: ${errorBody}`
        );
    }

    if (!response.body) {
        throw new Error("No response body from OpenRouter");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    // Track tool calls being assembled across chunks
    const toolCallsInProgress: Map<
        number,
        { id: string; name: string; arguments: string }
    > = new Map();

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process complete SSE lines
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === ":" || !trimmed.startsWith("data: ")) continue;

                const data = trimmed.slice(6);
                if (data === "[DONE]") {
                    // Emit any completed tool calls
                    for (const [, tc] of toolCallsInProgress) {
                        callbacks.onToolCall({
                            id: tc.id,
                            type: "function",
                            function: { name: tc.name, arguments: tc.arguments },
                        });
                    }
                    toolCallsInProgress.clear();
                    callbacks.onDone(null);
                    return;
                }

                try {
                    const chunk = JSON.parse(data) as OpenRouterStreamChunk;
                    const choice = chunk.choices[0];
                    if (!choice) continue;

                    const delta = choice.delta;
                    if (delta?.content) {
                        callbacks.onTextChunk(delta.content);
                    }

                    // Handle tool calls being streamed incrementally
                    if (delta?.tool_calls) {
                        for (const tc of delta.tool_calls) {
                            const index = tc.id
                                ? Array.from(toolCallsInProgress.keys()).length
                                : Array.from(toolCallsInProgress.keys()).length - 1;

                            if (tc.id) {
                                // New tool call started
                                const idx = toolCallsInProgress.size;
                                toolCallsInProgress.set(idx, {
                                    id: tc.id,
                                    name: tc.function?.name || "",
                                    arguments: tc.function?.arguments || "",
                                });
                            } else {
                                // Continuation of existing tool call
                                const lastIdx = toolCallsInProgress.size - 1;
                                const existing = toolCallsInProgress.get(lastIdx);
                                if (existing) {
                                    if (tc.function?.name) existing.name += tc.function.name;
                                    if (tc.function?.arguments)
                                        existing.arguments += tc.function.arguments;
                                }
                            }
                        }
                    }

                    if (choice.finish_reason === "tool_calls") {
                        // Emit completed tool calls
                        for (const [, tc] of toolCallsInProgress) {
                            callbacks.onToolCall({
                                id: tc.id,
                                type: "function",
                                function: { name: tc.name, arguments: tc.arguments },
                            });
                        }
                        toolCallsInProgress.clear();
                        callbacks.onDone("tool_calls");
                        return;
                    }

                    if (choice.finish_reason === "stop") {
                        callbacks.onDone("stop");
                        return;
                    }
                } catch {
                    // Skip malformed JSON lines
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
}

/**
 * Create a non-streaming request to continue after tool use
 */
export async function createChatCompletionNonStreaming(
    messages: OpenRouterMessage[],
    model: string,
    useTools: boolean = true
): Promise<{
    content: string | null;
    toolCalls: OpenRouterToolCall[];
    finishReason: string | null;
}> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY is not set");
    }

    const body: Record<string, unknown> = {
        model,
        messages,
        stream: false,
        temperature: 0.7,
        max_tokens: 8192,
    };
    if (useTools) {
        body.tools = TOOL_DEFINITIONS;
    }

    const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://stacklearn.dev",
            "X-Title": "StackLearn",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenRouter API error ${response.status}: ${errorBody}`);
    }

    const data = (await response.json()) as {
        choices: Array<{
            message: {
                content: string | null;
                tool_calls?: OpenRouterToolCall[];
            };
            finish_reason: string | null;
        }>;
    };

    const choice = data.choices[0];
    return {
        content: choice?.message?.content || null,
        toolCalls: choice?.message?.tool_calls || [],
        finishReason: choice?.finish_reason || null,
    };
}
