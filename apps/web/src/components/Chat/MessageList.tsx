import React, { useRef, useEffect } from "react";
import type { ChatMessage } from "../../types";
import { MessageBubble } from "./MessageBubble";

interface MessageListProps {
    messages: ChatMessage[];
    onExplainCode?: (code: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
    messages,
    onExplainCode,
}) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    if (messages.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-md animate-fade-in">
                    {/* Logo / Hero */}
                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-24 h-24 rounded-full bg-brand-500/10 animate-pulse-slow" />
                        </div>
                        <div className="relative text-5xl">🚀</div>
                    </div>
                    <h2 className="text-xl font-bold text-surface-100 mb-2">
                        Welcome to StackLearn
                    </h2>
                    <p className="text-sm text-surface-400 mb-6 leading-relaxed">
                        Ask about any tech stack, framework, or tool.
                        I'll explain it and give you a live, runnable playground.
                    </p>

                    {/* Suggestion chips */}
                    <div className="flex flex-wrap justify-center gap-2">
                        {[
                            "What is Hono.js?",
                            "Explain Zustand",
                            "How does tRPC work?",
                            "What's new in React 19?",
                        ].map((suggestion) => (
                            <button
                                key={suggestion}
                                onClick={() => onExplainCode?.(suggestion)}
                                className="px-3 py-1.5 rounded-full text-xs font-medium bg-surface-800/50 border border-surface-700/50 text-surface-300 hover:text-surface-100 hover:bg-surface-700/50 hover:border-brand-500/30 transition-all duration-200"
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
        <div className="flex-1 overflow-y-auto p-4 space-y-4" id="message-list">
            {messages.map((msg) => (
                <MessageBubble
                    key={msg.id}
                    message={msg}
                    onExplainCode={onExplainCode}
                />
            ))}
            <div ref={bottomRef} />
        </div>
    );
};
