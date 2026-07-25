import React, { useRef, useEffect } from "react";
import { Terminal as XTerminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { useThemeStore } from "../../store/themeStore";

interface TerminalProps {
    output: string[];
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

export const Terminal: React.FC<TerminalProps> = ({ output }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const termRef = useRef<XTerminal | null>(null);
    const fitRef = useRef<FitAddon | null>(null);
    const lastOutputLength = useRef(0);
    const theme = useThemeStore((state) => state.theme);

    useEffect(() => {
        if (!containerRef.current) return;

        const term = new XTerminal({
            theme: theme === "dark" ? DARK_TERMINAL_THEME : LIGHT_TERMINAL_THEME,
            fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace",
            lineHeight: 1.4,
            cursorBlink: false,
            convertEol: true,
            scrollback: 1000,
        });

        const fit = new FitAddon();
        term.loadAddon(fit);
        term.open(containerRef.current);
        fit.fit();

        termRef.current = term;
        fitRef.current = fit;

        const resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(() => {
                fit.fit();
            });
        });
        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
            term.dispose();
        };
    }, []);

    // Write new output
    useEffect(() => {
        const term = termRef.current;
        if (!term) return;

        // Write only new output since last render
        for (let i = lastOutputLength.current; i < output.length; i++) {
            term.write(output[i]);
        }
        lastOutputLength.current = output.length;
    }, [output]);

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

    return (
        <div
            ref={containerRef}
            className="h-full w-full bg-surface-900"
            id="terminal-container"
        />
    );
};
