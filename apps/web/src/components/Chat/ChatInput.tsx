import React, { useState, useRef, useEffect } from "react";

interface ChatInputProps {
    onSend: (message: string) => void;
    isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading }) => {
    const [value, setValue] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        const ta = textareaRef.current;
        if (ta) {
            ta.style.height = "auto";
            ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
        }
    }, [value]);

    const handleSubmit = () => {
        if (value.trim() && !isLoading) {
            onSend(value);
            setValue("");
            if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="p-4 border-t border-surface-800/40" id="chat-input-container">
            <div className="relative group">
                {/* Glow border effect */}
                <div className="absolute -inset-[1px] bg-gradient-to-r from-flame-orange/40 via-flame-rose/30 to-flame-violet/40 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-[1px]" />

                <div className="relative flex items-center gap-2 bg-surface-900/80 border border-surface-700/50 rounded-2xl p-3 group-focus-within:border-brand-500/40 transition-colors duration-200">
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about any tech stack..."
                        rows={1}
                        disabled={isLoading}
                        id="chat-input-textarea"
                        className="flex-1 bg-transparent text-surface-100 placeholder-surface-500 resize-none outline-none text-sm leading-relaxed min-h-[24px] max-h-[160px] disabled:opacity-50"
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={!value.trim() || isLoading}
                        id="chat-send-button"
                        className="hover-lift flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-gradient-to-br from-flame-orange via-flame-rose to-flame-violet disabled:from-surface-700 disabled:via-surface-700 disabled:to-surface-700 disabled:text-surface-500 text-white transition-all duration-200 shadow-flame disabled:shadow-none"
                    >
                        {isLoading ? (
                            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="1" stroke="currentColor" strokeWidth="3" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
            <p className="text-[11px] text-surface-600 mt-2 text-center">
                Press <kbd className="px-1.5 py-0.5 rounded bg-surface-800 text-surface-400 font-mono text-[10px]">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 rounded bg-surface-800 text-surface-400 font-mono text-[10px]">Shift+Enter</kbd> for newline
            </p>
        </div>
    );
};
