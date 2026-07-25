import type {
    LLMMessage,
    LLMStreamChunk,
    LLMToolCall,
} from "../types/index.js";
import { TOOL_DEFINITIONS } from "../agent/prompts.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

interface StreamCallbacks {
    onTextChunk: (text: string) => void;
    onToolCall: (toolCall: LLMToolCall) => void;
    onDone: (finishReason: string | null) => void;
    onError: (error: Error) => void;
}

/**
 * Create a streaming chat completion request to Groq.
 * Groq's API is OpenAI-compatible: streamed SSE `data: {...}` chunks with
 * `choices[0].delta`. Text and tool-call deltas are surfaced via callbacks.
 */
export async function createChatCompletion(
    messages: LLMMessage[],
    model: string,
    callbacks: StreamCallbacks,
    useTools: boolean = true
): Promise<void> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error("GROQ_API_KEY is not set");
    }

    const body: Record<string, unknown> = {
        model,
        messages,
        stream: true,
        temperature: 0.7,
        // Kept moderate so a full agent turn (initial call + a follow-up after a
        // browse_url tool result) fits within Groq's free-tier tokens-per-minute
        // budget. Still ample for an explanation plus a compact playground config.
        max_tokens: 4096,
    };
    if (useTools) {
        body.tools = TOOL_DEFINITIONS;
        // The app only ever needs one tool call at a time (browse_url). Disabling
        // parallel tool calls keeps the streamed deltas simple to reassemble.
        body.parallel_tool_calls = false;
    }

    const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Groq API error ${response.status}: ${errorBody}`);
    }

    if (!response.body) {
        throw new Error("No response body from Groq");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    // Track tool calls being assembled across chunks, keyed by the `index`
    // field on each streamed tool-call delta. Keying by index (rather than a
    // size-based heuristic) keeps interleaved argument chunks assigned to the
    // right call even when multiple tool calls stream concurrently.
    const toolCallsInProgress: Map<
        number,
        { id: string; name: string; arguments: string }
    > = new Map();

    const emitToolCalls = () => {
        // Emit in index order so callers see a stable ordering.
        for (const index of Array.from(toolCallsInProgress.keys()).sort((a, b) => a - b)) {
            const tc = toolCallsInProgress.get(index)!;
            callbacks.onToolCall({
                id: tc.id,
                type: "function",
                function: { name: tc.name, arguments: tc.arguments },
            });
        }
        toolCallsInProgress.clear();
    };

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
                    // Groq sends a trailing `[DONE]` after the final chunk. If we
                    // reach it with tool calls still buffered (no explicit
                    // finish_reason chunk), flush them now.
                    if (toolCallsInProgress.size > 0) {
                        emitToolCalls();
                        callbacks.onDone("tool_calls");
                    } else {
                        callbacks.onDone(null);
                    }
                    return;
                }

                try {
                    const chunk = JSON.parse(data) as LLMStreamChunk;
                    const choice = chunk.choices[0];
                    if (!choice) continue;

                    const delta = choice.delta;
                    if (delta?.content) {
                        callbacks.onTextChunk(delta.content);
                    }

                    // Handle tool calls being streamed incrementally. Each delta
                    // carries an `index` identifying which tool call it belongs to.
                    if (delta?.tool_calls) {
                        for (const tc of delta.tool_calls) {
                            const index = tc.index ?? 0;
                            const existing = toolCallsInProgress.get(index);
                            if (existing) {
                                if (tc.id) existing.id = tc.id;
                                if (tc.function?.name) existing.name += tc.function.name;
                                if (tc.function?.arguments)
                                    existing.arguments += tc.function.arguments;
                            } else {
                                toolCallsInProgress.set(index, {
                                    id: tc.id || "",
                                    name: tc.function?.name || "",
                                    arguments: tc.function?.arguments || "",
                                });
                            }
                        }
                    }

                    if (choice.finish_reason === "tool_calls") {
                        emitToolCalls();
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

        // Stream ended without an explicit finish_reason or [DONE] sentinel.
        if (toolCallsInProgress.size > 0) {
            emitToolCalls();
            callbacks.onDone("tool_calls");
        } else {
            callbacks.onDone(null);
        }
    } finally {
        reader.releaseLock();
    }
}

/**
 * Create a non-streaming request to continue after tool use.
 */
export async function createChatCompletionNonStreaming(
    messages: LLMMessage[],
    model: string,
    useTools: boolean = true
): Promise<{
    content: string | null;
    toolCalls: LLMToolCall[];
    finishReason: string | null;
}> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error("GROQ_API_KEY is not set");
    }

    const body: Record<string, unknown> = {
        model,
        messages,
        stream: false,
        temperature: 0.7,
        max_tokens: 4096,
    };
    if (useTools) {
        body.tools = TOOL_DEFINITIONS;
        body.parallel_tool_calls = false;
    }

    const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Groq API error ${response.status}: ${errorBody}`);
    }

    const data = (await response.json()) as {
        choices: Array<{
            message: {
                content: string | null;
                tool_calls?: LLMToolCall[];
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
