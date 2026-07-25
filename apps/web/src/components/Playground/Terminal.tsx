import React, { useRef, useEffect, useState } from "react";
import { Terminal as XTerminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { useThemeStore } from "../../store/themeStore";

interface TerminalProps {
    output: string[];
    onInput?: (data: string) => void;
    onClear?: () => void;
}

const DARK_TERMINAL_THEME = {
    background: "#101013",
    foreground: "#e2e8f0",
    cursor: "#7a2cfd",
    selectionBackground: "#35353d",
    black: "#0a0a0c",
    red: "#f87171",
    green: "#4ade80",
    yellow: "#fbbf24",
    blue: "#60a5fa",
    magenta: "#e1427f",
    cyan: "#22d3ee",
    white: "#e2e8f0",
};

const LIGHT_TERMINAL_THEME = {
    background: "#ffffff",
    foreground: "#18181c",
    cursor: "#7a2cfd",
    selectionBackground: "#d9c2ff",
    black: "#f4f4f7",
    red: "#dc2626",
    green: "#16a34a",
    yellow: "#b45309",
    blue: "#2563eb",
    magenta: "#be185d",
    cyan: "#0891b2",
    white: "#18181c",
};

export const Terminal: React.FC<TerminalProps> = ({ output, onInput, onClear }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const termRef = useRef<XTerminal | null>(null);
    const fitRef = useRef<FitAddon | null>(null);
    const lastOutputLength = useRef(0);
    // Gate writes until xterm's renderer has initialized its dimensions (one
    // frame after open). Writing/fitting before then makes xterm schedule an
    // internal refresh that reads undefined dimensions and throws.
    const [isReady, setIsReady] = useState(false);
    const theme = useThemeStore((state) => state.theme);

    useEffect(() => {
        if (!containerRef.current) return;

        const term = new XTerminal({
            theme: theme === "dark" ? DARK_TERMINAL_THEME : LIGHT_TERMINAL_THEME,
            fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace",
            lineHeight: 1.4,
            cursorBlink: !!onInput, // Blink when interactive
            convertEol: true,
            scrollback: 1000,
        });

        const fit = new FitAddon();
        term.loadAddon(fit);
        term.open(containerRef.current);

        // Fitting while the container is hidden or zero-sized throws inside
        // xterm ("cannot read properties of undefined (reading 'dimensions')").
        // Guard every fit so panel toggles and early resizes stay silent.
        const safeFit = () => {
            const el = containerRef.current;
            if (!el || el.offsetWidth === 0 || el.offsetHeight === 0) return;
            try {
                fit.fit();
            } catch {
                // Renderer not ready yet — the ResizeObserver will retry.
            }
        };

        termRef.current = term;
        fitRef.current = fit;

        // Forward keystrokes to the process stdin
        if (onInput) {
            term.onData((data) => {
                onInput(data);
            });
        }

        // Defer the first fit to the next frame — by then xterm has initialized
        // its renderer dimensions, so fitting/writing no longer races.
        let rafId = 0;
        rafId = requestAnimationFrame(() => {
            safeFit();
            setIsReady(true);
        });

        const resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(safeFit);
        });
        resizeObserver.observe(containerRef.current);

        return () => {
            cancelAnimationFrame(rafId);
            resizeObserver.disconnect();
            term.dispose();
        };
    }, []);

    // Write new output
    useEffect(() => {
        const term = termRef.current;
        if (!term || !isReady) return;

        // Write only new output since last render. Wrap each write in try/catch:
        // writing while the terminal is momentarily detached (e.g. a panel
        // switch) can throw inside xterm's scroll-area sync. Advance the cursor
        // only past writes that succeed, so nothing is silently dropped.
        let i = lastOutputLength.current;
        try {
            for (; i < output.length; i++) {
                term.write(output[i]);
            }
        } catch {
            // Leave the rest for the next render pass.
        }
        lastOutputLength.current = i;
    }, [output, isReady]);

    // Reset when output is cleared
    useEffect(() => {
        if (output.length === 0 && termRef.current) {
            termRef.current.clear();
            lastOutputLength.current = 0;
        }
    }, [output.length]);

    // Live-update terminal colors when the theme is toggled (without losing scrollback)
    useEffect(() => {
        if (termRef.current) {
            termRef.current.options.theme = theme === "dark" ? DARK_TERMINAL_THEME : LIGHT_TERMINAL_THEME;
        }
    }, [theme]);

    // Update onInput handler when it changes
    useEffect(() => {
        const term = termRef.current;
        if (!term) return;
        term.options.cursorBlink = !!onInput;
    }, [onInput]);

    return (
        <div className="h-full w-full flex flex-col" id="terminal-wrapper">
            {/* Terminal header */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-surface-900/50 border-b border-surface-800/40 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent-400/60" />
                    <span className="text-[10px] font-medium text-surface-500 uppercase tracking-wider">Terminal</span>
                </div>
                {onClear && (
                    <button
                        onClick={onClear}
                        title="Clear terminal"
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-surface-500 hover:text-surface-300 hover:bg-surface-800/50 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                            <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
                        </svg>
                        Clear
                    </button>
                )}
            </div>
            {/* Terminal body */}
            <div
                ref={containerRef}
                className="flex-1 bg-surface-900 min-h-0"
            />
        </div>
    );
};
