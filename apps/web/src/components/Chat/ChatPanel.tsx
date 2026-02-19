import React from "react";
import { useChat } from "../../hooks/useChat";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";

export const ChatPanel: React.FC = () => {
    const { messages, isLoading, error, sendMessage, clearMessages } = useChat();

    const handleExplainCode = (code: string) => {
        // If it's a suggestion chip (short text), send directly
        if (code.length < 100) {
            sendMessage(code);
        } else {
            sendMessage(`Explain this code:\n\`\`\`\n${code}\n\`\`\``);
        }
    };

    return (
        <div className="flex flex-col h-full bg-surface-950" id="chat-panel">
            {/* Chat header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800/50">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent-400 animate-pulse" />
                    <h2 className="text-sm font-semibold text-surface-200">Chat</h2>
                </div>
                {messages.length > 0 && (
                    <button
                        onClick={clearMessages}
                        className="text-xs text-surface-500 hover:text-surface-300 transition-colors px-2 py-1 rounded hover:bg-surface-800/50"
                        id="clear-chat-button"
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* Error banner */}
            {error && (
                <div className="mx-4 mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs animate-slide-up">
                    ⚠️ {error}
                </div>
            )}

            {/* Messages */}
            <MessageList messages={messages} onExplainCode={handleExplainCode} />

            {/* Input */}
            <ChatInput onSend={sendMessage} isLoading={isLoading} />
        </div>
    );
};
