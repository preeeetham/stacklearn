import React, { useRef, useEffect } from "react";
import type { ChatMessage } from "../../types";
import { MessageBubble } from "./MessageBubble";

interface MessageListProps {
    messages: ChatMessage[];
    onExplainCode?: (code: string) => void;
    onRetryPlayground?: (reason: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
    messages,
    onExplainCode,
    onRetryPlayground,
}) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    if (messages.length === 0) {
        return (
            <div className="flex flex-1 items-center justify-center p-8">
                <div className="max-w-sm text-center animate-fade-in">
                    <img
                        src="/logo.png"
                        alt=""
                        className="mx-auto mb-4 h-10 w-10 object-contain animate-float drop-shadow-[0_8px_20px_rgba(132,64,255,0.4)]"
                    />
                    <h2 className="mb-1.5 text-base font-medium text-surface-100">Fresh conversation</h2>
                    <p className="mb-5 text-sm text-surface-400">
                        The playground keeps its files. Ask about it, or start on something new.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {["Explain the playground code", "What is Hono.js?", "Explain Zustand"].map((suggestion) => (
                            <button
                                key={suggestion}
                                onClick={() => onExplainCode?.(suggestion)}
                                className="chip rounded-full px-3 py-1.5 text-xs text-surface-300 hover:text-surface-100"
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6" id="message-list">
            {messages.map((msg) => (
                <MessageBubble
                    key={msg.id}
                    message={msg}
                    onExplainCode={onExplainCode}
                    onRetryPlayground={onRetryPlayground}
                />
            ))}
            <div ref={bottomRef} />
        </div>
    );
};
