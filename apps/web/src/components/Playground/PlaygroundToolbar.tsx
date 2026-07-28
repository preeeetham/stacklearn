import React from "react";
import JSZip from "jszip";
import { useToastStore } from "../../store/toastStore";
import type { ForwardedPort } from "../../store/playgroundStore";

interface PlaygroundToolbarProps {
    files: Record<string, string>;
    isRunning: boolean;
    isInstalling: boolean;
    isRunnable: boolean;
    ports: ForwardedPort[];
    activePreviewPort: number | null;
    previewActive: boolean;
    onSelectPort: (port: number) => void;
    onRun: () => void;
    onStop: () => void;
}

export const PlaygroundToolbar: React.FC<PlaygroundToolbarProps> = ({
    files,
    isRunning,
    isInstalling,
    isRunnable,
    ports,
    activePreviewPort,
    previewActive,
    onSelectPort,
    onRun,
    onStop,
}) => {
    const addToast = useToastStore((s) => s.addToast);

    const handleExport = async () => {
        const zip = new JSZip();
        for (const [path, content] of Object.entries(files)) {
            zip.file(path, content);
        }
        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "stacklearn-project.zip";
        a.click();
        URL.revokeObjectURL(url);
        addToast("Project exported as ZIP", "success");
    };

    const handleCopyFiles = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(files, null, 2));
            addToast("Files copied to clipboard", "success");
        } catch {
            addToast("Failed to copy to clipboard", "error");
        }
    };

    return (
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-surface-800/40" id="playground-toolbar">
            <div className="flex items-center gap-1 p-1 rounded-full bg-surface-900/60 border border-surface-800/50">
                {/* Run / Stop button */}
                {isRunning && !isInstalling ? (
                    <button
                        onClick={onStop}
                        id="stop-button"
                        title="Stop (⌘ Enter)"
                        className="hover-lift flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all duration-200 border border-red-500/30"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                            <path fillRule="evenodd" d="M5.5 5h9a.5.5 0 01.5.5v9a.5.5 0 01-.5.5h-9a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5z" clipRule="evenodd" />
                        </svg>
                        Stop
                    </button>
                ) : (
                    <button
                        onClick={onRun}
                        disabled={isInstalling || !isRunnable}
                        id="run-button"
                        title={isRunnable ? "Run (⌘ Enter)" : "Reference only — nothing to run"}
                        className="hover-lift flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-flame-orange via-flame-rose to-flame-violet disabled:from-surface-700 disabled:via-surface-700 disabled:to-surface-700 text-white transition-all duration-200 shadow-flame disabled:shadow-none disabled:cursor-not-allowed"
                    >
                        {isInstalling ? (
                            <>
                                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Installing…
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                </svg>
                                Run
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Live port / preview switcher — appears when the running program
                forwards a port. Clicking one opens that port's preview over the
                editor; clicking the active one flips back to the code. This is
                how "localhost:3000" is actually reached (localhost won't work —
                the sandbox runs in the browser). */}
            {ports.length > 0 && (
                <div className="flex items-center gap-1 p-1 rounded-full bg-surface-900/60 border border-surface-800/50">
                    <span className="pl-2 pr-0.5 text-[10px] font-medium text-surface-500 uppercase tracking-wider">
                        Ports
                    </span>
                    {ports.map(({ port }) => {
                        const active = previewActive && activePreviewPort === port;
                        return (
                            <button
                                key={port}
                                onClick={() => onSelectPort(port)}
                                title={
                                    active
                                        ? `Hide preview (back to code)`
                                        : `Open preview for port ${port} — localhost:${port} maps here`
                                }
                                className={`flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-150 ${
                                    active
                                        ? "bg-surface-800/60 border border-surface-700/40 text-brand-300"
                                        : "text-surface-500 hover:text-surface-300 hover:bg-surface-800/30 border border-transparent"
                                }`}
                            >
                                <span className="font-mono">:{port}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="flex-1" />

            {/* Status indicator */}
            {isRunning && (
                <div className="flex items-center gap-1.5 text-xs text-accent-400 px-3 py-1.5 rounded-full bg-accent-500/10 border border-accent-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse" />
                    Running
                </div>
            )}

            {/* Copy files button */}
            <button
                onClick={handleCopyFiles}
                id="copy-files-button"
                title="Copy files to clipboard"
                className="hover-lift flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-800/70 hover:bg-surface-700 text-surface-300 hover:text-surface-100 transition-colors border border-surface-700/50"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M5.5 3.5A1.5 1.5 0 0 1 7 2h2.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 1 .439 1.061V9.5A1.5 1.5 0 0 1 12 11V8.621a3 3 0 0 0-.879-2.121L9 4.379A3 3 0 0 0 6.879 3.5H5.5Z" />
                    <path d="M4 5a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 4 14h5a1.5 1.5 0 0 0 1.5-1.5V8.621a1.5 1.5 0 0 0-.44-1.06L7.94 5.439A1.5 1.5 0 0 0 6.878 5H4Z" />
                </svg>
                Copy
            </button>

            {/* Export button */}
            <button
                onClick={handleExport}
                id="export-button"
                className="hover-lift flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-800/70 hover:bg-surface-700 text-surface-300 hover:text-surface-100 transition-colors border border-surface-700/50"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                    <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                </svg>
                Export
            </button>
        </div>
    );
};
