import type {
    ChatMessage,
    OpenRouterMessage,
    OpenRouterToolCall,
    PlaygroundConfig,
    BrowseUrlArgs,
} from "../types/index.js";
import { SYSTEM_PROMPT } from "./prompts.js";
import { browseUrl } from "./browse.js";
import {
    createChatCompletion,
    createChatCompletionNonStreaming,
} from "../lib/openrouter.js";
import type { SSEWriter } from "../lib/sse.js";

const DEFAULT_MODEL = process.env.DEFAULT_MODEL || "anthropic/claude-3.5-sonnet";
const MAX_TOOL_ITERATIONS = 5;

/**
 * Parse playground config from the assistant's response text.
 */
function parsePlaygroundConfig(text: string): PlaygroundConfig | null {
    const startTag = "<playground_config>";
    const endTag = "</playground_config>";
    const startIdx = text.indexOf(startTag);
    const endIdx = text.indexOf(endTag);

    if (startIdx === -1 || endIdx === -1) return null;

    const jsonStr = text.slice(startIdx + startTag.length, endIdx).trim();
    try {
        return JSON.parse(jsonStr) as PlaygroundConfig;
    } catch {
        return null;
    }
}

/**
 * Remove playground config block from visible text.
 */
function stripPlaygroundConfig(text: string): string {
    const startTag = "<playground_config>";
    const endTag = "</playground_config>";
    const startIdx = text.indexOf(startTag);
    const endIdx = text.indexOf(endTag);

    if (startIdx === -1 || endIdx === -1) return text;

    return (text.slice(0, startIdx) + text.slice(endIdx + endTag.length)).trim();
}

/**
 * Main agent orchestrator that handles the conversation loop:
 * 1. Sends messages to OpenRouter with streaming
 * 2. Handles tool calls (browse_url)
 * 3. Streams response events to the client via SSE
 */
export async function runAgent(
    messages: ChatMessage[],
    model: string | undefined,
    writer: SSEWriter
): Promise<void> {
    const selectedModel = model || DEFAULT_MODEL;

    // Build the OpenRouter messages array
    const openRouterMessages: OpenRouterMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
        })),
    ];

    let iterations = 0;
    let fullResponseText = "";
    let useTools = true;

    // Try first request — if tools aren't supported, retry without them
    while (iterations < MAX_TOOL_ITERATIONS) {
        iterations++;

        let pendingToolCalls: OpenRouterToolCall[] = [];
        let finishReason: string | null = null;
        let streamedText = "";
        let needsRetryWithoutTools = false;

        // We stream text to the client. If tool calls happen, we handle them.
        try {
            await new Promise<void>((resolve, reject) => {
                createChatCompletion(openRouterMessages, selectedModel, {
                    onTextChunk(text) {
                        // Buffer text and check for playground_config start
                        streamedText += text;

                        // Check if we're inside a playground_config block
                        const configStart = streamedText.indexOf("<playground_config>");
                        if (configStart === -1) {
                            // Not inside config block, safe to stream everything
                            writer.send({ type: "text", content: text });
                        } else {
                            // We've started receiving playground config — only send text before the tag
                            const beforeConfig = text.substring(
                                0,
                                Math.max(0, configStart - (streamedText.length - text.length))
                            );
                            if (beforeConfig) {
                                writer.send({ type: "text", content: beforeConfig });
                            }
                            // Don't send the playground config text to the chat
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

            // Check if the error is about tool use not being supported
            if (
                useTools &&
                iterations === 1 &&
                (errorMsg.includes("tool use") ||
                    errorMsg.includes("tool_use") ||
                    errorMsg.includes("tools") ||
                    errorMsg.includes("No endpoints found"))
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
            openRouterMessages.push({
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
                    openRouterMessages.push({
                        role: "tool",
                        content: result,
                        tool_call_id: toolCall.id,
                    });
                }
            }

            // Continue the loop — the next iteration will stream the agent's response
            pendingToolCalls = [];
            continue;
        }

        // No tool calls — we're done
        // Parse playground config from the full response
        const config = parsePlaygroundConfig(fullResponseText);
        if (config) {
            writer.send({
                type: "playground_config",
                config,
            });
        }

        break;
    }

    writer.send({ type: "done" });
    writer.close();
}
