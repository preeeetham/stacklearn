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
    | SSEDoneEvent
    | SSEErrorEvent;

export interface ModelInfo {
    id: string;
    name: string;
    description: string;
}

export interface OpenRouterMessage {
    role: "system" | "user" | "assistant" | "tool";
    content: string;
    tool_call_id?: string;
    tool_calls?: OpenRouterToolCall[];
}

export interface OpenRouterToolCall {
    id: string;
    type: "function";
    function: {
        name: string;
        arguments: string;
    };
}

export interface OpenRouterChoice {
    delta?: {
        content?: string | null;
        tool_calls?: OpenRouterToolCall[];
        role?: string;
    };
    finish_reason?: string | null;
}

export interface OpenRouterStreamChunk {
    id: string;
    choices: OpenRouterChoice[];
}

export interface BrowseUrlArgs {
    url: string;
    reason?: string;
}
