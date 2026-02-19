import React, { useRef, useEffect } from "react";
import { Terminal as XTerminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

interface TerminalProps {
    output: string[];
}

export const Terminal: React.FC<TerminalProps> = ({ output }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const termRef = useRef<XTerminal | null>(null);
    const fitRef = useRef<FitAddon | null>(null);
    const lastOutputLength = useRef(0);

    useEffect(() => {
        if (!containerRef.current) return;

        const term = new XTerminal({
            theme: {
                background: "#0c1222",
                foreground: "#e2e8f0",
                cursor: "#6366f1",
                selectionBackground: "#334155",
                black: "#0f172a",
                red: "#f87171",
                green: "#4ade80",
                yellow: "#fbbf24",
                blue: "#60a5fa",
                magenta: "#c084fc",
                cyan: "#22d3ee",
                white: "#e2e8f0",
            },
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

    return (
        <div
            ref={containerRef}
            className="h-full w-full bg-[#0c1222]"
            id="terminal-container"
        />
    );
};
