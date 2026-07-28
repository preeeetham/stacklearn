// Shared frontend types
import type { PlaygroundConfig } from "@stacklearn/shared";

export type { PlaygroundConfig };

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    toolCalls?: ToolCallInfo[];
    playgroundConfig?: PlaygroundConfig;
    // Reason the playground config failed validation, if it did. Cleared on
    // a successful retry (a fresh playgroundConfig arrives, or a later
    // message succeeds).
    playgroundError?: string;
    followUps?: string[];
    isStreaming?: boolean;
}

export interface ToolCallInfo {
    tool: string;
    url?: string;
    reason?: string;
    status: "loading" | "done";
}

export interface SSEEvent {
    type:
        | "text"
        | "tool_call"
        | "tool_result"
        | "playground_config"
        | "follow_ups"
        | "done"
        | "error"
        | "playground_error";
    content?: string;
    tool?: string;
    url?: string;
    reason?: string;
    config?: PlaygroundConfig;
    questions?: string[];
    message?: string;
}

export interface ModelInfo {
    id: string;
    name: string;
    description: string;
}
