import type {
    LLMMessage,
    LLMStreamChunk,
    LLMToolCall,
} from "../types/index.js";
import { TOOL_DEFINITIONS } from "../agent/prompts.js";
import { providerForModel, type ProviderConfig } from "./providers.js";

interface StreamCallbacks {
    onTextChunk: (text: string) => void;
    onToolCall: (toolCall: LLMToolCall) => void;
    onDone: (finishReason: string | null) => void;
    onError: (error: Error) => void;
}

// NVIDIA NIM's free tier allows 40 requests/minute; Groq has its own
// per-minute caps. A rate-limited (429) or briefly unavailable (502/503/504)
// response is retried with backoff instead of failing the whole agent turn.
const MAX_RETRIES = 3;
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
const MAX_BACKOFF_MS = 20_000;

function backoffMs(attempt: number, retryAfter: string | null): number {
    const seconds = retryAfter ? Number(retryAfter) : NaN;
    if (Number.isFinite(seconds) && seconds > 0) {
        return Math.min(seconds * 1000, MAX_BACKOFF_MS);
    }
    // 1.5s, 3s, 6s (+ jitter)
    return Math.min(1500 * 2 ** attempt + Math.random() * 500, MAX_BACKOFF_MS);
}

function buildBody(
    provider: ProviderConfig,
    messages: LLMMessage[],
    model: string,
    stream: boolean,
    useTools: boolean
): Record<string, unknown> {
    const body: Record<string, unknown> = {
        model,
        messages,
        stream,
        // Moderate temperature. Code reliability is handled structurally by
        // emitting files as raw <file> blocks (see prompts.ts) rather than by
        // starving the sampler — very low temperatures made the model lock onto
        // a single, sometimes-broken completion for a given prompt.
        temperature: 0.4,
        max_tokens: provider.maxTokens,
    };
    if (useTools) {
        body.tools = TOOL_DEFINITIONS;
        // The app only ever needs one tool call at a time (browse_url).
        // Disabling parallel tool calls keeps streamed deltas simple to
        // reassemble; providers that don't accept the flag just get the tools.
        if (provider.supportsParallelToolCallsFlag) {
            body.parallel_tool_calls = false;
        }
    }
    return body;
}

/**
 * POST to the provider's OpenAI-compatible endpoint, retrying rate-limit and
 * transient upstream errors. Throws on any other non-2xx status.
 */
async function postCompletion(
    model: string,
    body: Record<string, unknown>
): Promise<Response> {
    const provider = providerForModel(model);
    const apiKey = process.env[provider.apiKeyEnv];
    if (!apiKey) {
        throw new Error(`${provider.apiKeyEnv} is not set (needed for ${provider.label} model ${model})`);
    }

    for (let attempt = 0; ; attempt++) {
        const response = await fetch(provider.url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(body),
        });

        if (response.ok) return response;

        const errorBody = await response.text();
        if (RETRYABLE_STATUS.has(response.status) && attempt < MAX_RETRIES) {
            const wait = backoffMs(attempt, response.headers.get("retry-after"));
            console.warn(
                `${provider.label} ${response.status} for ${model}; retrying in ${Math.round(wait)}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
            );
            await new Promise((r) => setTimeout(r, wait));
            continue;
        }
        if (response.status === 429) {
            throw new Error(
                `${provider.label} rate limit reached — please wait a minute and try again.`
            );
        }
        throw new Error(`${provider.label} API error ${response.status}: ${errorBody}`);
    }
}

/**
 * Create a streaming chat completion request to the model's provider
 * (NVIDIA NIM or Groq). Both APIs are OpenAI-compatible: streamed SSE `data: {...}` chunks with
 * `choices[0].delta`. Text and tool-call deltas are surfaced via callbacks.
 */
export async function createChatCompletion(
    messages: LLMMessage[],
    model: string,
    callbacks: StreamCallbacks,
    useTools: boolean = true
): Promise<void> {
    const provider = providerForModel(model);
    const response = await postCompletion(
        model,
        buildBody(provider, messages, model, true, useTools)
    );

    if (!response.body) {
        throw new Error(`No response body from ${provider.label}`);
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
                    // Providers send a trailing `[DONE]` after the final chunk. If we
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
    const provider = providerForModel(model);
    const response = await postCompletion(
        model,
        buildBody(provider, messages, model, false, useTools)
    );

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
