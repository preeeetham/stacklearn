import type {
    ChatMessage,
    LLMMessage,
    LLMToolCall,
    PlaygroundConfig,
    BrowseUrlArgs,
} from "../types/index.js";
import { SYSTEM_PROMPT } from "./prompts.js";
import { browseUrl } from "./browse.js";
import {
    createChatCompletion,
    createChatCompletionNonStreaming,
} from "../lib/groq.js";
import type { SSEWriter } from "../lib/sse.js";

const DEFAULT_MODEL = process.env.DEFAULT_MODEL || "llama-3.3-70b-versatile";
const MAX_TOOL_ITERATIONS = 5;

// Control blocks the model emits after the visible explanation. Their contents
// are parsed by the system and must never be streamed to the chat UI.
const PLAYGROUND_START = "<playground_config>";
const PLAYGROUND_END = "</playground_config>";
const FOLLOWUPS_START = "<follow_ups>";
const FOLLOWUPS_END = "</follow_ups>";
// Files are emitted as raw <file path="...">…</file> blocks (not JSON-escaped
// inside the config), so the model writes code as plain text instead of
// escaping a whole file into a JSON string — the escaping is where it used to
// drop closing quotes/brackets and produce code that wouldn't compile.
const FILE_START = "<file";
const FILE_BLOCK_RE = /<file\s+path=["']([^"']+)["']\s*>\n?([\s\S]*?)<\/file>/g;
const CONTROL_TAGS = [PLAYGROUND_START, FOLLOWUPS_START, FILE_START];

/**
 * Extract the JSON payload between a start/end tag pair, or null if absent.
 */
function extractBlock(text: string, startTag: string, endTag: string): string | null {
    const startIdx = text.indexOf(startTag);
    const endIdx = text.indexOf(endTag);
    if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return null;
    return text.slice(startIdx + startTag.length, endIdx).trim();
}

/**
 * Parse playground config from the assistant's response text.
 *
 * The <playground_config> block carries JSON metadata only (runtime, entry,
 * commands, port). File contents live in separate raw <file path="…">…</file>
 * blocks so the model never has to escape code into a JSON string.
 */
function parsePlaygroundConfig(text: string): PlaygroundConfig | null {
    const metaStr = extractBlock(text, PLAYGROUND_START, PLAYGROUND_END);
    if (!metaStr) return null;

    let meta: Partial<PlaygroundConfig>;
    try {
        meta = JSON.parse(metaStr) as Partial<PlaygroundConfig>;
    } catch {
        return null;
    }

    // Collect the raw file blocks. Trailing whitespace before </file> is
    // trimmed; the first newline right after the opening tag is dropped by the
    // regex so file contents start on their own line cleanly.
    const files: Record<string, string> = {};
    FILE_BLOCK_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = FILE_BLOCK_RE.exec(text)) !== null) {
        const path = match[1].trim();
        const contents = match[2].replace(/\s+$/, "");
        if (path) files[path] = contents;
    }

    if (Object.keys(files).length === 0) return null;

    const firstFile = Object.keys(files)[0];
    const entry = meta.entry || firstFile;

    const config: PlaygroundConfig = {
        runtime: "node",
        entry,
        files,
        installCommand: meta.installCommand || "npm install",
        startCommand: meta.startCommand || `npx tsx ${entry}`,
        previewPort: meta.previewPort ?? null,
    };

    return normalizePlaygroundConfig(config);
}

/**
 * Parse the follow-up questions block into a list of up to 3 strings.
 */
function parseFollowUps(text: string): string[] | null {
    const jsonStr = extractBlock(text, FOLLOWUPS_START, FOLLOWUPS_END);
    if (!jsonStr) return null;
    try {
        const parsed = JSON.parse(jsonStr) as unknown;
        if (!Array.isArray(parsed)) return null;
        const questions = parsed
            .filter((q): q is string => typeof q === "string")
            .map((q) => q.trim())
            .filter((q) => q.length > 0)
            .slice(0, 3);
        return questions.length > 0 ? questions : null;
    } catch {
        return null;
    }
}

/**
 * Guarantee the playground config actually runs in the WebContainer sandbox even
 * if the model forgot a detail: force `tsx` over the fragile `ts-node`, and make
 * sure `tsx` + `typescript` are declared when the entry file is TypeScript.
 */
function normalizePlaygroundConfig(config: PlaygroundConfig): PlaygroundConfig {
    const usesTypeScript =
        config.entry?.endsWith(".ts") ||
        Object.keys(config.files || {}).some((f) => f.endsWith(".ts"));

    // ts-node is unreliable in WebContainers; tsx is the drop-in replacement.
    let startCommand = (config.startCommand || "").replace(/\bts-node\b/g, "tsx");
    if (usesTypeScript && !/\btsx\b/.test(startCommand) && /\bnode\b/.test(startCommand)) {
        startCommand = startCommand.replace(/\bnode\b/, "tsx");
    }

    const files = { ...config.files };
    if (usesTypeScript && typeof files["package.json"] === "string") {
        try {
            const pkg = JSON.parse(files["package.json"]) as {
                devDependencies?: Record<string, string>;
                dependencies?: Record<string, string>;
                [k: string]: unknown;
            };
            pkg.devDependencies = pkg.devDependencies || {};
            const hasDep = (name: string) =>
                pkg.devDependencies?.[name] || pkg.dependencies?.[name];
            if (!hasDep("tsx")) pkg.devDependencies.tsx = "^4.19.0";
            if (!hasDep("typescript")) pkg.devDependencies.typescript = "^5.5.0";
            files["package.json"] = JSON.stringify(pkg, null, 2);
        } catch {
            // Leave package.json untouched if it isn't valid JSON.
        }
    }

    return { ...config, startCommand, files };
}

/**
 * Length of text that is safe to stream to the UI: everything before the first
 * control block, holding back a trailing fragment that might be a partial
 * opening tag (e.g. "<play") so it never leaks into the visible chat.
 */
function safeVisibleLength(text: string): number {
    let cut = text.length;
    for (const tag of CONTROL_TAGS) {
        const idx = text.indexOf(tag);
        if (idx !== -1) cut = Math.min(cut, idx);
    }
    if (cut === text.length) {
        const lt = text.lastIndexOf("<");
        if (lt !== -1) {
            const suffix = text.slice(lt);
            if (CONTROL_TAGS.some((tag) => tag.startsWith(suffix))) {
                cut = lt;
            }
        }
    }
    return cut;
}

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

    // Try first request — if tools aren't supported, retry without them
    while (iterations < MAX_TOOL_ITERATIONS) {
        iterations++;

        let pendingToolCalls: LLMToolCall[] = [];
        let finishReason: string | null = null;
        let streamedText = "";
        let emittedLen = 0;
        let needsRetryWithoutTools = false;

        // We stream text to the client. If tool calls happen, we handle them.
        try {
            await new Promise<void>((resolve, reject) => {
                createChatCompletion(llmMessages, selectedModel, {
                    onTextChunk(text) {
                        // Accumulate, then emit only the newly-safe portion — i.e.
                        // text before any control block (playground_config /
                        // follow_ups), holding back a possible partial opening tag.
                        streamedText += text;
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
            continue;
        }

        // No tool calls — we're done.
        // Parse the control blocks out of the full response.
        const config = parsePlaygroundConfig(fullResponseText);
        if (config) {
            writer.send({
                type: "playground_config",
                config,
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
