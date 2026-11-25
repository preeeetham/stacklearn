import React from "react";
import { motion } from "motion/react";
import { PromptInput } from "../ui/PromptInput";
import { Spotlight } from "../ui/SpotlightNew";
import { TextGenerateEffect } from "../ui/TextGenerateEffect";
import { HoverEffect, type HoverItem } from "../ui/CardHoverEffect";

interface HeroProps {
    onSend: (message: string) => void;
    isLoading: boolean;
}

const SUGGESTIONS: HoverItem[] = [
    { title: "What is Hono.js?", description: "Edge-first web framework, with a running API.", tag: "Backend" },
    { title: "Explain Zustand", description: "Tiny state management, shown with a counter demo.", tag: "State" },
    { title: "How does tRPC work?", description: "End-to-end typesafe APIs without codegen.", tag: "Types" },
    { title: "What's new in React 19?", description: "Actions, use(), and the new compiler.", tag: "Frontend" },
];

const PLACEHOLDERS = [
    "Ask about any tech stack…",
    "How do Bun's workspaces work?",
    "Show me Drizzle ORM with SQLite",
    "What is Effect-TS and why use it?",
    "Build a tiny Express + Zod API",
];

const HEADLINE = "Learn any tech stack by running it.";
// "running it." is set in the accent colour.
const ACCENT_FROM = HEADLINE.split(" ").length - 2;

const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: [0.2, 0.7, 0.2, 1] as const },
});

/**
 * First-run landing view: shown until the first question is asked, then the
 * app switches to the chat + playground workspace.
 */
export const Hero: React.FC<HeroProps> = ({ onSend, isLoading }) => (
    <div className="relative z-10 flex-1 overflow-hidden" id="hero">
        {/* Clip the spotlight's oversized beams so they never create scroll. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <Spotlight />
        </div>
        {/* Scrolls only on genuinely short viewports; normally it all fits. */}
        <div className="relative h-full overflow-y-auto scrollbar-hide">
        <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center px-5 py-8">
            <motion.p
                {...fadeUp(0)}
                className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-surface-500"
            >
                Interactive learning for developers
            </motion.p>

            <TextGenerateEffect
                words={HEADLINE}
                className="text-center text-4xl font-semibold leading-[1.1] tracking-tight text-surface-50 sm:text-5xl md:text-6xl"
                wordClassName={(i) => (i >= ACCENT_FROM ? "text-brand-400" : undefined)}
            />

            <motion.p
                {...fadeUp(0.5)}
                className="mt-6 max-w-xl text-center text-base text-surface-400"
            >
                Ask about a framework, library or tool. StackLearn explains it, checks the
                official docs when it needs to, and gives you a runnable playground.
            </motion.p>

            <motion.div {...fadeUp(0.7)} className="mt-10 w-full max-w-xl">
                <PromptInput
                    onSubmit={onSend}
                    isLoading={isLoading}
                    placeholders={PLACEHOLDERS}
                    autoFocus
                    id="hero-input"
                />
            </motion.div>

            <motion.div {...fadeUp(0.9)} className="mt-8 w-full">
                <HoverEffect
                    items={SUGGESTIONS}
                    onSelect={(item) => onSend(item.title)}
                    disabled={isLoading}
                />
            </motion.div>
        </div>
        </div>
    </div>
);
