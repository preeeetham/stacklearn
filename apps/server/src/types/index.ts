// Shared types for the StackLearn application

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

export interface ChatRequest {
    messages: ChatMessage[];
    model?: string;
}

export interface PlaygroundConfig {
    runtime: "node";
    entry: string;
    files: Record<string, string>;
    installCommand: string;
    startCommand: string;
    previewPort: number | null;
}

export interface SSETextEvent {
    type: "text";
    content: string;
}

export interface SSEToolCallEvent {
    type: "tool_call";
    tool: string;
    url?: string;
    reason?: string;
}

export interface SSEToolResultEvent {
    type: "tool_result";
    tool: string;
}

export interface SSEPlaygroundConfigEvent {
    type: "playground_config";
    config: PlaygroundConfig;
}

export interface SSEFollowUpsEvent {
    type: "follow_ups";
    questions: string[];
}

export interface SSEDoneEvent {
    type: "done";
}

export interface SSEErrorEvent {
    type: "error";
    message: string;
}

export type SSEEvent =
    | SSETextEvent
    | SSEToolCallEvent
    | SSEToolResultEvent
    | SSEPlaygroundConfigEvent
    | SSEFollowUpsEvent
    | SSEDoneEvent
    | SSEErrorEvent;

export interface ModelInfo {
    id: string;
    name: string;
    description: string;
}

export interface LLMMessage {
    role: "system" | "user" | "assistant" | "tool";
    content: string;
    tool_call_id?: string;
    tool_calls?: LLMToolCall[];
}

export interface LLMToolCall {
    id: string;
    type: "function";
    function: {
        name: string;
        arguments: string;
    };
}

// Streaming tool-call deltas carry a per-call `index` so interleaved
// argument chunks from parallel tool calls can be reassembled correctly.
export interface LLMToolCallDelta {
    index: number;
    id?: string;
    type?: "function";
    function?: {
        name?: string;
        arguments?: string;
    };
}

export interface LLMChoice {
    delta?: {
        content?: string | null;
        tool_calls?: LLMToolCallDelta[];
        role?: string;
    };
    finish_reason?: string | null;
}

export interface LLMStreamChunk {
    id: string;
    choices: LLMChoice[];
}

export interface BrowseUrlArgs {
    url: string;
    reason?: string;
}
