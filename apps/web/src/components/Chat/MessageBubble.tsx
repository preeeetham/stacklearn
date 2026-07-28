import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "../../types";
import { ToolCallBadge } from "./ToolCallBadge";
import { stripPlaygroundConfig } from "../../lib/stripPlaygroundConfig";

interface MessageBubbleProps {
    message: ChatMessage;
    onExplainCode?: (code: string) => void;
    onRetryPlayground?: (reason: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
    message,
    onExplainCode,
    onRetryPlayground,
}) => {
    const isUser = message.role === "user";
    const displayContent = isUser
        ? message.content
        : stripPlaygroundConfig(message.content);

    return (
        <div
            className={`flex ${isUser ? "justify-end" : "justify-start"} animate-slide-up`}
            id={`message-${message.id}`}
        >
            <div
                className={`max-w-[85%] ${isUser
                        ? "bg-gradient-to-br from-brand-500/20 to-flame-violet/10 border border-brand-500/25 rounded-2xl rounded-br-md"
                        : "bg-transparent"
                    } ${isUser ? "px-4 py-3" : "px-1 py-1"}`}
            >
                {/* Tool call badges */}
                {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {message.toolCalls.map((tc, idx) => (
                            <ToolCallBadge key={idx} toolCall={tc} />
                        ))}
                    </div>
                )}

                {/* Message content */}
                {isUser ? (
                    <p className="text-sm text-surface-100 leading-relaxed whitespace-pre-wrap">
                        {displayContent}
                    </p>
                ) : (
                    <div className="markdown-content">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                code({ className, children, ...props }) {
                                    const match = /language-(\w+)/.exec(className || "");
                                    const isInline = !match && !className;

                                    if (isInline) {
                                        return (
                                            <code className={className} {...props}>
                                                {children}
                                            </code>
                                        );
                                    }

                                    const codeString = String(children).replace(/\n$/, "");

                                    return (
                                        <div className="relative group/code">
                                            <pre className={className}>
                                                <code className={className} {...props}>
                                                    {children}
                                                </code>
                                            </pre>
                                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/code:opacity-100 transition-opacity">
                                                <CopyButton text={codeString} />
                                                {onExplainCode && (
                                                    <button
                                                        onClick={() => onExplainCode(codeString)}
                                                        className="px-2 py-1 rounded text-[10px] font-medium bg-surface-700/80 hover:bg-surface-600 text-surface-300 hover:text-surface-100 backdrop-blur transition-colors"
                                                        title="Explain this code"
                                                    >
                                                        Explain
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                },
                            }}
                        >
                            {displayContent}
                        </ReactMarkdown>
                    </div>
                )}

                {/* Playground indicator */}
                {message.playgroundConfig && (
                    <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-500/10 border border-accent-500/20">
                        <div className="w-2 h-2 rounded-full bg-accent-400 animate-pulse" />
                        <span className="text-xs text-accent-300 font-medium">
                            Playground updated
                        </span>
                        <span className="text-xs text-surface-500">
                            — {Object.keys(message.playgroundConfig.files).length} files loaded
                        </span>
                    </div>
                )}

                {/* Playground validation failure — recoverable, so offer a retry
                    instead of silently having no playground appear. */}
                {!isUser && !message.isStreaming && message.playgroundError && (
                    <div className="mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 animate-slide-up">
                        <p className="text-xs text-red-300 leading-relaxed">
                            ⚠️ Playground failed to generate: {message.playgroundError}
                        </p>
                        {onRetryPlayground && (
                            <button
                                onClick={() => onRetryPlayground(message.playgroundError!)}
                                className="mt-2 px-2.5 py-1 rounded-md text-[11px] font-medium bg-red-500/15 hover:bg-red-500/25 text-red-200 transition-colors"
                            >
                                Retry
                            </button>
                        )}
                    </div>
                )}

                {/* Suggested follow-up questions */}
                {!isUser &&
                    !message.isStreaming &&
                    message.followUps &&
                    message.followUps.length > 0 && (
                        <div className="mt-3">
                            <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1.5">
                                Ask next
                            </p>
                            <div className="flex flex-col gap-1.5">
                                {message.followUps.map((q, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => onExplainCode?.(q)}
                                        className="hover-lift group/followup text-left px-3 py-1.5 rounded-xl text-xs bg-surface-800/40 border border-surface-700/40 text-surface-300 hover:text-surface-100 hover:bg-surface-700/50 hover:border-brand-500/30 transition-all duration-200 flex items-center gap-2"
                                    >
                                        <span className="text-brand-400 group-hover/followup:translate-x-0.5 transition-transform">
                                            →
                                        </span>
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                {/* Typing indicator */}
                {message.isStreaming && !message.content && (
                    <div className="flex items-center gap-1 px-2 py-2">
                        <div className="typing-dot w-1.5 h-1.5 rounded-full bg-brand-400" />
                        <div className="typing-dot w-1.5 h-1.5 rounded-full bg-brand-400" />
                        <div className="typing-dot w-1.5 h-1.5 rounded-full bg-brand-400" />
                    </div>
                )}
            </div>
        </div>
    );
};

// Copy button component
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="px-2 py-1 rounded text-[10px] font-medium bg-surface-700/80 hover:bg-surface-600 text-surface-300 hover:text-surface-100 backdrop-blur transition-colors"
            title="Copy code"
        >
            {copied ? "Copied!" : "Copy"}
        </button>
    );
};
