import React, { useEffect, useRef, useState } from "react";
import { ModelSelector } from "../Layout/ModelSelector";

interface PromptInputProps {
    onSubmit: (value: string) => void;
    isLoading: boolean;
    /** Placeholder prompts cycled while the field is empty. */
    placeholders: string[];
    size?: "lg" | "md";
    autoFocus?: boolean;
    id?: string;
}

/**
 * Compact prompt box with cycling placeholders and the model picker sitting
 * underneath it. Enter sends, Shift+Enter inserts a newline.
 */
export const PromptInput: React.FC<PromptInputProps> = ({
    onSubmit,
    isLoading,
    placeholders,
    size = "md",
    autoFocus = false,
    id = "chat-input",
}) => {
    const [value, setValue] = useState("");
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const maxHeight = 160;
    const textSize = size === "lg" ? "text-[15px]" : "text-sm";

    useEffect(() => {
        if (placeholders.length < 2) return;
        const t = setInterval(() => setPlaceholderIndex((i) => (i + 1) % placeholders.length), 3000);
        return () => clearInterval(t);
    }, [placeholders.length]);

    useEffect(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = "auto";
        // scrollHeight is 0 while the panel is hidden (behind the hero); leave
        // the CSS min-height in charge then instead of pinning 0px.
        if (ta.scrollHeight > 0) ta.style.height = Math.min(ta.scrollHeight, maxHeight) + "px";
    }, [value]);

    useEffect(() => {
        if (autoFocus) textareaRef.current?.focus();
    }, [autoFocus]);

    const submit = () => {
        const text = value.trim();
        if (!text || isLoading) return;
        setValue("");
        onSubmit(text);
    };

    return (
        <div id={`${id}-container`}>
            <div className="flex items-end gap-2 rounded-xl border border-surface-700 bg-surface-900 py-1.5 pl-3.5 pr-1.5 shadow-float transition-colors focus-within:border-surface-500">
                <div className="relative min-w-0 flex-1 py-1">
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                submit();
                            }
                        }}
                        rows={1}
                        aria-label="Ask StackLearn"
                        id={`${id}-textarea`}
                        className={`block min-h-[24px] w-full resize-none bg-transparent leading-6 text-surface-100 outline-none ${textSize}`}
                        style={{ maxHeight }}
                    />
                    {!value && (
                        <span
                            key={placeholderIndex}
                            className={`pointer-events-none absolute left-0 top-1 max-w-full truncate leading-6 text-surface-500 animate-placeholder-in ${textSize}`}
                        >
                            {placeholders[placeholderIndex]}
                        </span>
                    )}
                </div>

                <button
                    onClick={submit}
                    disabled={!value.trim() || isLoading}
                    id={`${id}-send`}
                    aria-label="Send"
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white transition-colors hover:bg-brand-600 disabled:bg-surface-800 disabled:text-surface-500"
                >
                    {isLoading ? (
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                            <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
                        </svg>
                    )}
                </button>
            </div>

            <div className="mt-1.5 flex justify-end">
                <ModelSelector />
            </div>
        </div>
    );
};
