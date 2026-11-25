import React from "react";
import { PromptInput } from "../ui/PromptInput";
import { FlipWords } from "../ui/FlipWords";

interface HeroProps {
    onSend: (message: string) => void;
    isLoading: boolean;
}

const SUGGESTIONS = [
    {
        title: "What is Hono.js?",
        blurb: "Edge-first web framework, with a running API",
        tag: "Backend",
    },
    {
        title: "Explain Zustand",
        blurb: "Tiny state management, shown with a counter demo",
        tag: "State",
    },
    {
        title: "How does tRPC work?",
        blurb: "End-to-end typesafe APIs without codegen",
        tag: "Types",
    },
    {
        title: "What's new in React 19?",
        blurb: "Actions, use(), and the new compiler",
        tag: "Frontend",
    },
];

const PLACEHOLDERS = [
    "Ask about any tech stack…",
    "How do Bun's workspaces work?",
    "Show me Drizzle ORM with SQLite",
    "What is Effect-TS and why use it?",
    "Build a tiny Express + Zod API",
];

const FEATURES = [
    {
        label: "Reads the docs live",
        icon: (
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
        ),
    },
    {
        label: "Runs in your browser",
        icon: (
            <path fillRule="evenodd" d="M2 4.25A2.25 2.25 0 014.25 2h11.5A2.25 2.25 0 0118 4.25v11.5A2.25 2.25 0 0115.75 18H4.25A2.25 2.25 0 012 15.75V4.25zm4.03 2.47a.75.75 0 00-1.06 1.06L7.19 10l-2.22 2.22a.75.75 0 101.06 1.06l2.75-2.75a.75.75 0 000-1.06L6.03 6.72zM10 12.5a.75.75 0 000 1.5h4a.75.75 0 000-1.5h-4z" clipRule="evenodd" />
        ),
    },
    {
        label: "Export as a project",
        icon: (
            <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75zM3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
        ),
    },
];

/**
 * First-run landing view: shown until the first question is asked, then the
 * app switches to the chat + playground workspace.
 */
export const Hero: React.FC<HeroProps> = ({ onSend, isLoading }) => {
    return (
        <div className="relative z-10 flex-1 overflow-y-auto" id="hero">
            <div className="mx-auto flex min-h-full max-w-4xl flex-col items-center justify-center px-5 py-12 sm:py-16">
                <h1 className="animate-rise [animation-delay:80ms] text-center text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
                    <span className="text-surface-50">Learn any stack.</span>
                    <br />
                    <FlipWords
                        className="text-brand-400 pb-2"
                        words={["Run it live.", "Read the docs.", "Ship the demo.", "Break it safely."]}
                    />
                </h1>

                <p className="animate-rise [animation-delay:160ms] mt-6 max-w-xl text-center text-base text-surface-400 sm:text-lg">
                    Ask about a framework, library or tool. StackLearn explains it, checks the
                    official docs when it needs to, and gives you a runnable playground.
                </p>

                <div className="animate-rise [animation-delay:240ms] mt-10 w-full max-w-xl">
                    <PromptInput
                        onSubmit={onSend}
                        isLoading={isLoading}
                        placeholders={PLACEHOLDERS}
                        size="lg"
                        autoFocus
                        id="hero-input"
                    />
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-surface-500">
                        {FEATURES.map((f) => (
                            <span key={f.label} className="inline-flex items-center gap-1.5">
                                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-surface-400">
                                    {f.icon}
                                </svg>
                                {f.label}
                            </span>
                        ))}
                    </div>
                </div>

                <div className="animate-rise [animation-delay:320ms] mt-12 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                    {SUGGESTIONS.map((s) => (
                        <button
                            key={s.title}
                            onClick={() => onSend(s.title)}
                            disabled={isLoading}
                            className="group rounded-xl border border-surface-800 bg-surface-900 p-4 text-left transition-colors hover:border-surface-600 hover:bg-surface-850 disabled:opacity-60"
                        >
                            <div className="flex items-start gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-medium text-surface-100">{s.title}</span>
                                        <span className="text-[10px] font-medium uppercase tracking-wider text-surface-500">
                                            {s.tag}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs text-surface-400">{s.blurb}</p>
                                </div>
                                <span className="self-center text-surface-500 transition-all duration-300 group-hover:translate-x-1 group-hover:text-surface-200">
                                    →
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
