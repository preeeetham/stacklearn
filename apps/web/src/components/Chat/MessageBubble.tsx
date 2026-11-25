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
            className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} animate-slide-up`}
            id={`message-${message.id}`}
        >
            {!isUser && (
                <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-surface-700 bg-surface-850">
                    <img src="/logo.png" alt="" className="h-4 w-4 object-contain" />
                </div>
            )}
            <div
                className={`min-w-0 ${isUser
                    ? "max-w-[85%] rounded-2xl rounded-br-md border border-surface-700 bg-surface-800 px-4 py-2.5"
                    : "flex-1 pt-0.5"
                    }`}
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
                                            {match && (
                                                <span className="absolute left-3 top-2 z-10 font-mono text-[10px] uppercase tracking-wider text-surface-500">
                                                    {match[1]}
                                                </span>
                                            )}
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
                                                        className="chip px-2 py-1 rounded-md text-[10px] font-medium text-surface-300 hover:text-surface-100 backdrop-blur"
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
                    <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-accent-500/25 bg-accent-500/10 px-3 py-2">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-accent-400">
                            <path fillRule="evenodd" d="M6.28 5.22a.75.75 0 010 1.06L2.56 10l3.72 3.72a.75.75 0 01-1.06 1.06L.97 10.53a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 0zm7.44 0a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L17.44 10l-3.72-3.72a.75.75 0 010-1.06z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-medium text-accent-300">Playground ready</span>
                        <span className="text-xs text-surface-500">
                            {Object.keys(message.playgroundConfig.files).length} files
                        </span>
                    </div>
                )}

                {/* Playground validation failure — recoverable, so offer a retry
                    instead of silently having no playground appear. */}
                {!isUser && !message.isStreaming && message.playgroundError && (
                    <div className="mt-3 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/25 animate-slide-up">
                        <p className="text-xs text-red-300 leading-relaxed">
                            The playground couldn't be generated: {message.playgroundError}
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
                            <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2">
                                Ask next
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {message.followUps.map((q, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => onExplainCode?.(q)}
                                        className="chip group/followup text-left px-3 py-1.5 rounded-full text-xs text-surface-300 hover:text-surface-50 hover:border-brand-500/40 flex items-center gap-1.5"
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
                    <div className="py-1.5 text-sm">
                        <span className="text-shimmer font-medium">Thinking…</span>
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
            className="chip px-2 py-1 rounded-md text-[10px] font-medium text-surface-300 hover:text-surface-100 backdrop-blur"
            title="Copy code"
        >
            {copied ? "Copied!" : "Copy"}
        </button>
    );
};
