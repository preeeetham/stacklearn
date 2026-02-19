import React, { useState } from "react";
import { usePlayground } from "../../hooks/usePlayground";
import { FileTree } from "./FileTree";
import { CodeEditor } from "./CodeEditor";
import { Terminal } from "./Terminal";
import { PreviewPane } from "./PreviewPane";
import { PlaygroundToolbar } from "./PlaygroundToolbar";

export const PlaygroundPanel: React.FC = () => {
    const {
        config,
        files,
        activeFile,
        isRunning,
        isInstalling,
        terminalOutput,
        previewUrl,
        isBooted,
        setActiveFile,
        handleFileChange,
        handleRun,
        handleReset,
    } = usePlayground();

    const [showPreview, setShowPreview] = useState(true);
    const [bottomPanel, setBottomPanel] = useState<"terminal" | "preview">("terminal");

    // Empty state
    if (!config) {
        return (
            <div className="flex items-center justify-center h-full bg-surface-950" id="playground-panel-empty">
                <div className="text-center max-w-sm animate-fade-in">
                    <div className="relative mb-4">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-20 h-20 rounded-full bg-glow-cyan/5 animate-pulse-slow" />
                        </div>
                        <div className="relative text-4xl">⚡</div>
                    </div>
                    <h3 className="text-base font-semibold text-surface-300 mb-2">
                        Playground
                    </h3>
                    <p className="text-sm text-surface-500 leading-relaxed">
                        Ask a question in the chat and a live, runnable playground will appear here automatically.
                    </p>
                    {!isBooted && (
                        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-surface-600">
                            <div className="w-3 h-3 border-2 border-surface-600/30 border-t-surface-500 rounded-full animate-spin" />
                            Booting WebContainer...
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const activeFileContent = files[activeFile] || "";

    return (
        <div className="flex flex-col h-full bg-surface-950" id="playground-panel">
            {/* Toolbar */}
            <PlaygroundToolbar
                files={files}
                isRunning={isRunning}
                isInstalling={isInstalling}
                onRun={handleRun}
                onReset={handleReset}
            />

            {/* Main content */}
            <div className="flex-1 flex overflow-hidden">
                {/* File tree sidebar */}
                <div className="w-44 flex-shrink-0 border-r border-surface-800/50 bg-surface-900/50 overflow-hidden">
                    <div className="px-3 py-2 text-[10px] font-bold text-surface-500 uppercase tracking-wider">
                        Files
                    </div>
                    <FileTree
                        files={files}
                        activeFile={activeFile}
                        onSelectFile={setActiveFile}
                    />
                </div>

                {/* Editor + Bottom panels */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Editor */}
                    <div className="flex-1 overflow-hidden min-h-0">
                        {/* File tab */}
                        <div className="flex items-center px-3 py-1.5 bg-surface-900/80 border-b border-surface-800/50">
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface-800/50 text-xs">
                                <span className="text-brand-400 font-mono">{activeFile}</span>
                            </div>
                        </div>
                        <div className="h-[calc(100%-32px)]">
                            <CodeEditor
                                value={activeFileContent}
                                fileName={activeFile}
                                onChange={(val) => handleFileChange(activeFile, val)}
                            />
                        </div>
                    </div>

                    {/* Bottom panel tabs */}
                    <div className="border-t border-surface-800/50">
                        <div className="flex items-center gap-1 px-2 py-1 bg-surface-900/80 border-b border-surface-800/50">
                            <button
                                onClick={() => setBottomPanel("terminal")}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${bottomPanel === "terminal"
                                        ? "bg-surface-800 text-surface-200"
                                        : "text-surface-500 hover:text-surface-300"
                                    }`}
                            >
                                Terminal
                            </button>
                            {previewUrl && (
                                <button
                                    onClick={() => setBottomPanel("preview")}
                                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${bottomPanel === "preview"
                                            ? "bg-surface-800 text-surface-200"
                                            : "text-surface-500 hover:text-surface-300"
                                        }`}
                                >
                                    Preview
                                </button>
                            )}
                        </div>

                        {/* Panel content */}
                        <div className="h-48">
                            {bottomPanel === "terminal" ? (
                                <Terminal output={terminalOutput} />
                            ) : (
                                <PreviewPane url={previewUrl} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
