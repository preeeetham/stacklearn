// Shared types for the StackLearn application
import type { PlaygroundConfig } from "@stacklearn/shared";

export type { PlaygroundConfig };

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

export interface ChatRequest {
    messages: ChatMessage[];
    model?: string;
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

// Distinct from SSEErrorEvent: this is a typed, recoverable failure — the
// playground config the model produced didn't validate — rather than a
// transport/agent-level error. The chat UI shows it with a retry action
// instead of ending the turn.
export interface SSEPlaygroundErrorEvent {
    type: "playground_error";
    message: string;
}

export type SSEEvent =
    | SSETextEvent
    | SSEToolCallEvent
    | SSEToolResultEvent
    | SSEPlaygroundConfigEvent
    | SSEFollowUpsEvent
    | SSEDoneEvent
    | SSEErrorEvent
    | SSEPlaygroundErrorEvent;

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
