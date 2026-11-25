import React from "react";
import { useChat } from "../../hooks/useChat";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";

export const ChatPanel: React.FC = () => {
    const { messages, isLoading, error, sendMessage, retryPlayground, clearMessages } = useChat();

    const handleExplainCode = (code: string) => {
        // Suggestion chips / follow-ups are short and sent as-is.
        if (code.length < 100) {
            sendMessage(code);
        } else {
            sendMessage(`Explain this code:\n\`\`\`\n${code}\n\`\`\``);
        }
    };

    return (
        <div className="flex h-full flex-col" id="chat-panel">
            <div className="flex items-center justify-between border-b border-surface-800/70 px-5 py-3">
                <div className="flex items-center gap-2.5">
                    <h2 className="text-sm font-medium text-surface-100">Conversation</h2>
                    <span className="text-xs text-surface-500">
                        {isLoading ? <span className="text-shimmer">thinking…</span> : `${messages.length} messages`}
                    </span>
                </div>
                {messages.length > 0 && (
                    <button
                        onClick={clearMessages}
                        disabled={isLoading}
                        className="chip rounded-full px-2.5 py-1 text-xs text-surface-400 hover:text-surface-100 disabled:opacity-50"
                        id="clear-chat-button"
                    >
                        Clear
                    </button>
                )}
            </div>

            {error && (
                <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300 animate-slide-up">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    {error}
                </div>
            )}

            <MessageList
                messages={messages}
                onExplainCode={handleExplainCode}
                onRetryPlayground={retryPlayground}
            />

            <ChatInput onSend={sendMessage} isLoading={isLoading} />
        </div>
    );
};
