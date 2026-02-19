// Shared frontend types

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    toolCalls?: ToolCallInfo[];
    playgroundConfig?: PlaygroundConfig;
    isStreaming?: boolean;
}

export interface ToolCallInfo {
    tool: string;
    url?: string;
    reason?: string;
    status: "loading" | "done";
}

export interface PlaygroundConfig {
    runtime: "node";
    entry: string;
    files: Record<string, string>;
    installCommand: string;
    startCommand: string;
    previewPort: number | null;
}

export interface SSEEvent {
    type: "text" | "tool_call" | "tool_result" | "playground_config" | "done" | "error";
    content?: string;
    tool?: string;
    url?: string;
    reason?: string;
    config?: PlaygroundConfig;
    message?: string;
}

export interface ModelInfo {
    id: string;
    name: string;
    description: string;
}
