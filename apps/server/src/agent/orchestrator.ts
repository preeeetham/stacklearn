import type {
    ChatMessage,
    LLMMessage,
    LLMToolCall,
    BrowseUrlArgs,
} from "../types/index.js";
import { SYSTEM_PROMPT } from "./prompts.js";
import { browseUrl } from "./browse.js";
import {
    createChatCompletion,
    createChatCompletionNonStreaming,
} from "../lib/groq.js";
import type { SSEWriter } from "../lib/sse.js";
import {
    parsePlaygroundConfig,
    parseFollowUps,
    safeVisibleLength,
    stripThinkBlocks,
} from "./parsePlaygroundConfig.js";

const DEFAULT_MODEL = process.env.DEFAULT_MODEL || "llama-3.3-70b-versatile";
const MAX_TOOL_ITERATIONS = 5;

/**
 * Main agent orchestrator that handles the conversation loop:
 * 1. Sends messages to the LLM (Groq) with streaming
 * 2. Handles tool calls (browse_url)
 * 3. Streams response events to the client via SSE
 */
export async function runAgent(
    messages: ChatMessage[],
    model: string | undefined,
    writer: SSEWriter
): Promise<void> {
    const selectedModel = model || DEFAULT_MODEL;

    // Build the LLM messages array
    const llmMessages: LLMMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
        })),
    ];

    let iterations = 0;
    let fullResponseText = "";
    let useTools = true;
    // Set after a tool-call round that emitted visible text, so the next
    // round's text gets a separator inserted before it — otherwise a
    // preamble like "Let me check the docs" from round 1 runs directly into
    // "Now, about Hono..." from round 2 with no space between them, both in
    // the accumulated parse buffer and in the chat UI (each round's streamed
    // chunks are appended to the same message with no delimiter of their own).
    let pendingRoundSeparator = false;

    // Try first request — if tools aren't supported, retry without them
    while (iterations < MAX_TOOL_ITERATIONS) {
        iterations++;

        let pendingToolCalls: LLMToolCall[] = [];
        let finishReason: string | null = null;
        // Raw text as it streams in from the model, before <think> stripping.
        let rawText = "";
        // Derived from rawText with <think>...</think> blocks removed — this
        // is what gets streamed to the client and accumulated for parsing.
        let streamedText = "";
        let emittedLen = 0;
        let needsRetryWithoutTools = false;
        let separatorInserted = !pendingRoundSeparator;

        // We stream text to the client. If tool calls happen, we handle them.
        try {
            await new Promise<void>((resolve, reject) => {
                createChatCompletion(llmMessages, selectedModel, {
                    onTextChunk(text) {
                        rawText += text;
                        let cleaned = stripThinkBlocks(rawText);
                        if (!separatorInserted && cleaned.length > 0) {
                            cleaned = "\n\n" + cleaned;
                            separatorInserted = true;
                        }
                        streamedText = cleaned;

                        // Accumulate, then emit only the newly-safe portion — i.e.
                        // text before any control block (playground_config /
                        // follow_ups), holding back a possible partial opening tag.
                        const visible = safeVisibleLength(streamedText);
                        if (visible > emittedLen) {
                            writer.send({
                                type: "text",
                                content: streamedText.slice(emittedLen, visible),
                            });
                            emittedLen = visible;
                        }
                    },
                    onToolCall(toolCall) {
                        pendingToolCalls.push(toolCall);
                    },
                    onDone(reason) {
                        finishReason = reason;
                        resolve();
                    },
                    onError(error) {
                        reject(error);
                    },
                }, useTools).catch(reject);
            });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);

            // Check if the error is about tool use not being supported.
            // Groq returns a 400 with an error message mentioning tools /
            // function calling when the selected model can't use them (all
            // currently-recommended Groq models do, so this is a safety net for
            // custom DEFAULT_MODEL / model overrides).
            const lowerErr = errorMsg.toLowerCase();
            if (
                useTools &&
                iterations === 1 &&
                (lowerErr.includes("tool") ||
                    lowerErr.includes("function calling") ||
                    lowerErr.includes("does not support"))
            ) {
                console.log(`Model ${selectedModel} doesn't support tools, retrying without tools...`);
                useTools = false;
                needsRetryWithoutTools = true;
                iterations = 0; // Reset counter
            } else {
                throw error;
            }
        }

        if (needsRetryWithoutTools) {
            continue;
        }

        fullResponseText += streamedText;

        // Handle tool calls
        if (finishReason === "tool_calls" && pendingToolCalls.length > 0) {
            // Add the assistant message with tool calls
            llmMessages.push({
                role: "assistant",
                content: streamedText || "",
                tool_calls: pendingToolCalls,
            });

            // Execute each tool call
            for (const toolCall of pendingToolCalls) {
                const { name, arguments: argsStr } = toolCall.function;

                if (name === "browse_url") {
                    let args: BrowseUrlArgs;
                    try {
                        args = JSON.parse(argsStr) as BrowseUrlArgs;
                    } catch {
                        args = { url: argsStr };
                    }

                    // Notify frontend about the tool call
                    writer.send({
                        type: "tool_call",
                        tool: "browse_url",
                        url: args.url,
                        reason: args.reason,
                    });

                    // Execute the browse
                    const result = await browseUrl(args);

                    // Notify frontend about the result
                    writer.send({
                        type: "tool_result",
                        tool: "browse_url",
                    });

                    // Add the tool result to the conversation
                    llmMessages.push({
                        role: "tool",
                        content: result,
                        tool_call_id: toolCall.id,
                    });
                }
            }

            // Continue the loop — the next iteration will stream the agent's response
            pendingToolCalls = [];
            pendingRoundSeparator = streamedText.length > 0;
            continue;
        }

        // No tool calls — we're done.
        // Parse -> validate -> repair -> report: extract the control blocks,
        // repair what can be repaired, validate against the shared schema,
        // and surface anything that still fails as a typed error the chat UI
        // can show with a retry, instead of silently dropping the playground.
        const parsed = parsePlaygroundConfig(fullResponseText);
        if (parsed.ok) {
            writer.send({
                type: "playground_config",
                config: parsed.config,
            });
        } else if (parsed.reason !== null) {
            writer.send({
                type: "playground_error",
                message: parsed.reason,
            });
        }

        const followUps = parseFollowUps(fullResponseText);
        if (followUps) {
            writer.send({
                type: "follow_ups",
                questions: followUps,
            });
        }

        break;
    }

    writer.send({ type: "done" });
    writer.close();
}
