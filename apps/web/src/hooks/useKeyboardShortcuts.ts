import { useEffect } from "react";

interface KeyboardShortcutHandlers {
    onRun: () => void;
    onStop: () => void;
    onSave: () => void;
    onToggleTerminal: () => void;
    onCloseTab: () => void;
    isRunning: boolean;
}

/**
 * Registers global keyboard shortcuts for the playground:
 * - Cmd/Ctrl + Enter  → Run (or Stop if running)
 * - Cmd/Ctrl + S      → Save file to WebContainer
 * - Cmd/Ctrl + `      → Toggle terminal focus
 * - Cmd/Ctrl + W      → Close active tab
 */
export function useKeyboardShortcuts({
    onRun,
    onStop,
    onSave,
    onToggleTerminal,
    onCloseTab,
    isRunning,
}: KeyboardShortcutHandlers) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const mod = e.metaKey || e.ctrlKey;
            if (!mod) return;

            switch (e.key) {
                case "Enter":
                    e.preventDefault();
                    if (isRunning) {
                        onStop();
                    } else {
                        onRun();
                    }
                    break;

                case "s":
                    e.preventDefault();
                    onSave();
                    break;

                case "`":
                    e.preventDefault();
                    onToggleTerminal();
                    break;

                case "w":
                    e.preventDefault();
                    onCloseTab();
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onRun, onStop, onSave, onToggleTerminal, onCloseTab, isRunning]);
}
