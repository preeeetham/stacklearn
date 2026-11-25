import React from "react";
import { ThemeToggle } from "./ThemeToggle";

interface HeaderProps {
    /** Shown in workspace mode: returns to the landing view by clearing the chat. */
    onNewChat?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNewChat }) => {
    return (
        <header className="relative z-50 flex justify-center px-3 pt-3" id="app-header">
            <div className="panel flex w-full max-w-[1600px] items-center justify-between gap-3 rounded-full py-1.5 pl-2 pr-1.5">
                <button
                    onClick={onNewChat}
                    disabled={!onNewChat}
                    className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors enabled:hover:bg-surface-800/60"
                    title={onNewChat ? "New chat" : undefined}
                >
                    <img
                        src="/logo.png"
                        alt=""
                        className="h-7 w-7 object-contain"
                    />
                    <span className="text-sm font-semibold tracking-tight text-surface-100">
                        StackLearn
                    </span>
                </button>

                <div className="flex items-center gap-1.5">
                    {onNewChat && (
                        <button
                            onClick={onNewChat}
                            id="new-chat-button"
                            className="chip hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-surface-300 hover:text-surface-100 sm:flex"
                        >
                            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                            </svg>
                            New chat
                        </button>
                    )}
                    <ThemeToggle />
                    <a
                        href="https://github.com/preeeetham/stacklearn"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="GitHub repository"
                        className="chip flex h-8 w-8 items-center justify-center rounded-full text-surface-400 hover:text-surface-100"
                    >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                    </a>
                </div>
            </div>
        </header>
    );
};
