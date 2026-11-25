// Header adapted from Aceternity UI — Resizable Navbar
// (https://ui.aceternity.com/components/resizable-navbar).
// The navbar's two states map to the app's two modes: transparent and wide on
// the landing page, a compact bordered bar once the workspace is open.
import React, { useState } from "react";
import { motion } from "motion/react";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "../../lib/utils";

const REPO_URL = "https://github.com/preeeetham/stacklearn";

const NAV_ITEMS = [
    { name: "GitHub", link: REPO_URL },
    { name: "Docs", link: `${REPO_URL}#readme` },
    { name: "Report an issue", link: `${REPO_URL}/issues` },
];

interface HeaderProps {
    /** Present in workspace mode: starts a new chat. */
    onNewChat?: () => void;
}

const NavItems: React.FC = () => {
    const [hovered, setHovered] = useState<number | null>(null);
    return (
        <div
            onMouseLeave={() => setHovered(null)}
            className="absolute inset-0 hidden items-center justify-center gap-1 text-sm font-medium md:flex pointer-events-none"
        >
            {NAV_ITEMS.map((item, idx) => (
                <a
                    key={item.name}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseEnter={() => setHovered(idx)}
                    className="pointer-events-auto relative px-4 py-2 text-surface-400 transition-colors hover:text-surface-100"
                >
                    {hovered === idx && (
                        <motion.div
                            layoutId="nav-hovered"
                            className="absolute inset-0 h-full w-full rounded-full bg-surface-800"
                            transition={{ type: "spring", stiffness: 400, damping: 35 }}
                        />
                    )}
                    <span className="relative z-20">{item.name}</span>
                </a>
            ))}
        </div>
    );
};

export const Header: React.FC<HeaderProps> = ({ onNewChat }) => {
    const compact = !!onNewChat;

    return (
        <header className="relative z-50 px-3 pt-3" id="app-header">
            <div
                className={cn(
                    "relative mx-auto flex w-full items-center justify-between rounded-full px-3 py-1.5 transition-[background-color,border-color,box-shadow,max-width] duration-500",
                    compact
                        ? "max-w-[1600px] border border-surface-800 bg-surface-900/80 shadow-float backdrop-blur-md"
                        : "max-w-6xl border border-transparent bg-transparent"
                )}
            >
                <button
                    onClick={onNewChat}
                    disabled={!onNewChat}
                    title={onNewChat ? "New chat" : undefined}
                    className="relative z-20 flex items-center gap-2 rounded-full py-1 pl-1 pr-3"
                >
                    <img src="/logo.png" alt="" className="h-7 w-7 object-contain" />
                    <span className="text-sm font-semibold tracking-tight text-surface-100">StackLearn</span>
                </button>

                <NavItems />

                <div className="relative z-20 flex items-center gap-2">
                    <ThemeToggle />
                    {onNewChat && (
                        <button
                            onClick={onNewChat}
                            id="new-chat-button"
                            className="rounded-full bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white shadow-float transition-colors hover:bg-brand-600"
                        >
                            New chat
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};
