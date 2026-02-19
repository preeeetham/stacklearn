import React from "react";
import JSZip from "jszip";

interface PlaygroundToolbarProps {
    files: Record<string, string>;
    isRunning: boolean;
    isInstalling: boolean;
    onRun: () => void;
    onReset: () => void;
}

export const PlaygroundToolbar: React.FC<PlaygroundToolbarProps> = ({
    files,
    isRunning,
    isInstalling,
    onRun,
    onReset,
}) => {
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
    };

    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-surface-900 border-b border-surface-800/50" id="playground-toolbar">
            {/* Run button */}
            <button
                onClick={onRun}
                disabled={isInstalling}
                id="run-button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-accent-600 hover:bg-accent-500 disabled:bg-surface-700 text-white transition-all duration-200 hover:shadow-lg hover:shadow-accent-500/25"
            >
                {isInstalling ? (
                    <>
                        <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Installing...
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

            {/* Reset button */}
            <button
                onClick={onReset}
                id="reset-button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-surface-100 transition-colors border border-surface-700/50"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H4.598a.75.75 0 00-.75.75v3.634a.75.75 0 001.5 0v-2.033l.312.311a7 7 0 0011.712-3.138.75.75 0 00-1.449-.389zm-7.624-6.36a7 7 0 0111.712 3.138.75.75 0 01-1.449.389 5.5 5.5 0 00-9.201-2.466l-.312.311h2.433a.75.75 0 010 1.5H7.237a.75.75 0 01-.75-.75V3.552a.75.75 0 011.5 0v2.033l.312-.311z" clipRule="evenodd" />
                </svg>
                Reset
            </button>

            <div className="flex-1" />

            {/* Status indicator */}
            {isRunning && (
                <div className="flex items-center gap-1.5 text-xs text-accent-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse" />
                    Running
                </div>
            )}

            {/* Export button */}
            <button
                onClick={handleExport}
                id="export-button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-surface-100 transition-colors border border-surface-700/50"
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
