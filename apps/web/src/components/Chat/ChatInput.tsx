import React from "react";
import { PromptInput } from "../ui/PromptInput";

interface ChatInputProps {
    onSend: (message: string) => void;
    isLoading: boolean;
}

const PLACEHOLDERS = [
    "Ask a follow-up…",
    "Change the demo to use TypeScript",
    "Explain the last file line by line",
    "Add error handling to the example",
];

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading }) => (
    <div className="px-4 pb-4 pt-2" id="chat-input-wrapper">
        <PromptInput onSubmit={onSend} isLoading={isLoading} placeholders={PLACEHOLDERS} />
        <p className="mt-2 text-center text-[11px] text-surface-600">
            <kbd className="rounded bg-surface-800 px-1.5 py-0.5 font-mono text-[10px] text-surface-400">Enter</kbd> to send ·{" "}
            <kbd className="rounded bg-surface-800 px-1.5 py-0.5 font-mono text-[10px] text-surface-400">Shift+Enter</kbd> for a new line
        </p>
    </div>
);
