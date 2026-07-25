import React, { useState, useCallback, useEffect, useRef } from "react";
import { usePlayground } from "../../hooks/usePlayground";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { usePlaygroundStore } from "../../store/playgroundStore";
import { FileTree } from "./FileTree";
import { CodeEditor } from "./CodeEditor";
import { Terminal } from "./Terminal";
import { PreviewPane } from "./PreviewPane";
import { PlaygroundToolbar } from "./PlaygroundToolbar";

const SPLIT_STORAGE_KEY = "stacklearn-editor-split";
const MIN_EDITOR_PCT = 30;
const MAX_EDITOR_PCT = 85;
const DEFAULT_EDITOR_PCT = 65;

const getStoredSplit = (): number => {
    try {
        const stored = Number(localStorage.getItem(SPLIT_STORAGE_KEY));
        if (stored >= MIN_EDITOR_PCT && stored <= MAX_EDITOR_PCT) return stored;
    } catch {
        // ignore
    }
    return DEFAULT_EDITOR_PCT;
};

export const PlaygroundPanel: React.FC = () => {
    const {
        config,
        files,
        activeFile,
        openTabs,
        isRunning,
        isInstalling,
        terminalOutput,
        previewUrl,
        ports,
        activePreviewPort,
        isBooted,
        setActiveFile,
        setActivePreviewPort,
        removeTab,
        handleFileChange,
        handleRun,
        handleReset,
        handleStop,
        handleSave,
        handleTerminalInput,
    } = usePlayground();

    // The preview takes over the (large) editor area rather than the cramped
    // bottom panel. Learners' code prints "visit localhost:3000", but only the
    // sandbox URL is reachable — so the moment a server is ready, show it.
    const [previewActive, setPreviewActive] = useState(false);
    const prevPreviewUrl = useRef<string | null>(null);
    useEffect(() => {
        if (previewUrl && !prevPreviewUrl.current) {
            setPreviewActive(true);
        } else if (!previewUrl) {
            setPreviewActive(false);
        }
        prevPreviewUrl.current = previewUrl;
    }, [previewUrl]);

    // Selecting a port from the toolbar shows that port's preview; re-clicking
    // the port that's already showing flips back to the code editor.
    const handleSelectPort = useCallback(
        (port: number) => {
            if (previewActive && activePreviewPort === port) {
                setPreviewActive(false);
            } else {
                setActivePreviewPort(port);
                setPreviewActive(true);
            }
        },
        [previewActive, activePreviewPort, setActivePreviewPort]
    );

    // Showing a file's code (clicking a tab / file) leaves preview mode.
    const showFile = useCallback(
        (path: string) => {
            setActiveFile(path);
            setPreviewActive(false);
        },
        [setActiveFile]
    );

    const showPreview = previewActive && !!previewUrl;

    const [editorPct, setEditorPct] = useState(getStoredSplit);
    const [isResizing, setIsResizing] = useState(false);
    const splitContainerRef = useRef<HTMLDivElement>(null);
    const [terminalFocused, setTerminalFocused] = useState(false);

    // Keyboard shortcuts
    useKeyboardShortcuts({
        onRun: handleRun,
        onStop: handleStop,
        onSave: handleSave,
        onReset: handleReset,
        onToggleTerminal: () => setTerminalFocused((f) => !f),
        onCloseTab: () => {
            if (activeFile && openTabs.length > 1) {
                removeTab(activeFile);
            }
        },
        isRunning,
    });

    // Vertical resize logic
    const handleResizeStart = useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    useEffect(() => {
        if (!isResizing) return;

        const handlePointerMove = (e: PointerEvent) => {
            const container = splitContainerRef.current;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const pct = ((e.clientY - rect.top) / rect.height) * 100;
            setEditorPct(Math.min(MAX_EDITOR_PCT, Math.max(MIN_EDITOR_PCT, pct)));
        };

        const handlePointerUp = () => {
            setIsResizing(false);
            setEditorPct((current) => {
                try {
                    localStorage.setItem(SPLIT_STORAGE_KEY, String(current));
                } catch {
                    // ignore
                }
                return current;
            });
        };

        document.body.style.cursor = "row-resize";
        document.body.style.userSelect = "none";
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);

        return () => {
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
        };
    }, [isResizing]);

    const clearTerminal = useCallback(() => {
        usePlaygroundStore.getState().clearTerminalOutput();
    }, []);

    // Empty state
    if (!config) {
        return (
            <div className="flex items-center justify-center h-full bg-transparent" id="playground-panel-empty">
                <div className="text-center max-w-sm animate-fade-in">
                    <div className="relative mb-4">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-20 h-20 rounded-full bg-flame-violet/10 animate-pulse-slow" />
                        </div>
                        <div className="relative text-4xl animate-float">⚡</div>
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
        <div className="flex flex-col h-full bg-transparent" id="playground-panel">
            {/* Toolbar */}
            <PlaygroundToolbar
                files={files}
                isRunning={isRunning}
                isInstalling={isInstalling}
                ports={ports}
                activePreviewPort={activePreviewPort}
                previewActive={showPreview}
                onSelectPort={handleSelectPort}
                onRun={handleRun}
                onStop={handleStop}
                onReset={handleReset}
            />

            {/* Main content */}
            <div className="flex-1 flex overflow-hidden">
                {/* File tree sidebar */}
                <div className="w-44 flex-shrink-0 border-r border-surface-800/40 bg-surface-900/30 overflow-hidden">
                    <div className="px-3 py-2 text-[10px] font-bold text-surface-500 uppercase tracking-wider">
                        Files
                    </div>
                    <FileTree
                        files={files}
                        activeFile={activeFile}
                        onSelectFile={showFile}
                    />
                </div>

                {/* Editor + Bottom panels */}
                <div ref={splitContainerRef} className="flex-1 flex flex-col overflow-hidden">
                    {/* Editor section — the preview overlays this large area when
                        a port is selected (toggled from the toolbar). */}
                    <div style={{ height: `${editorPct}%` }} className="flex flex-col overflow-hidden min-h-0">
                        {/* Multi-tab bar */}
                        <div className="flex items-center px-2 py-1 bg-surface-900/50 border-b border-surface-800/40 overflow-x-auto scrollbar-hide flex-shrink-0">
                            {openTabs.map((tab) => {
                                const isActive = tab === activeFile && !showPreview;
                                const baseName = tab.split("/").pop() || tab;
                                return (
                                    <div
                                        key={tab}
                                        className={`group flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs cursor-pointer transition-all duration-150 flex-shrink-0 ${
                                            isActive
                                                ? "bg-surface-800/60 border border-surface-700/40 text-brand-300"
                                                : "text-surface-500 hover:text-surface-300 hover:bg-surface-800/30 border border-transparent"
                                        }`}
                                        onClick={() => showFile(tab)}
                                        onMouseDown={(e) => {
                                            // Middle-click to close
                                            if (e.button === 1 && openTabs.length > 1) {
                                                e.preventDefault();
                                                removeTab(tab);
                                            }
                                        }}
                                    >
                                        <span className="font-mono truncate max-w-[120px]">{baseName}</span>
                                        {openTabs.length > 1 && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeTab(tab);
                                                }}
                                                className={`w-4 h-4 flex items-center justify-center rounded hover:bg-surface-700/60 transition-colors ${
                                                    isActive ? "opacity-60 hover:opacity-100" : "opacity-0 group-hover:opacity-60 hover:!opacity-100"
                                                }`}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-2.5 h-2.5">
                                                    <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                            {showPreview && activePreviewPort !== null && (
                                <div className="flex items-center gap-1.5 ml-1 px-2.5 py-1 rounded-lg text-xs bg-gradient-to-r from-flame-orange via-flame-rose to-flame-violet text-white shadow-flame flex-shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
                                    <span className="font-mono">Preview :{activePreviewPort}</span>
                                </div>
                            )}
                        </div>

                        {/* Editor + preview overlay. CodeEditor stays mounted (its
                            cursor/scroll/undo survive the toggle); the preview sits
                            on top when active. */}
                        <div className="flex-1 min-h-0 relative">
                            <div className="absolute inset-0">
                                <CodeEditor
                                    value={activeFileContent}
                                    fileName={activeFile}
                                    onChange={(val) => handleFileChange(activeFile, val)}
                                />
                            </div>
                            {showPreview && (
                                <div className="absolute inset-0 z-10 bg-surface-950">
                                    <PreviewPane url={previewUrl} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Horizontal drag handle */}
                    <div
                        onPointerDown={handleResizeStart}
                        onDoubleClick={() => {
                            setEditorPct(DEFAULT_EDITOR_PCT);
                            try {
                                localStorage.setItem(SPLIT_STORAGE_KEY, String(DEFAULT_EDITOR_PCT));
                            } catch { /* ignore */ }
                        }}
                        title="Drag to resize — double-click to reset"
                        className="h-2 flex-shrink-0 flex items-center justify-center cursor-row-resize group touch-none"
                        id="editor-terminal-resizer"
                    >
                        <div
                            className={`w-12 h-0.5 rounded-full transition-all duration-200 ${
                                isResizing
                                    ? "bg-gradient-to-r from-flame-orange via-flame-rose to-flame-violet w-20 shadow-flame"
                                    : "bg-surface-700 group-hover:bg-gradient-to-r group-hover:from-flame-orange group-hover:via-flame-rose group-hover:to-flame-violet group-hover:w-20"
                            }`}
                        />
                    </div>

                    {/* Bottom panel — always the terminal now that the preview
                        lives in the large editor area above. */}
                    <div style={{ height: `${100 - editorPct}%` }} className="flex flex-col overflow-hidden min-h-0 border-t border-surface-800/40">
                        <div className="flex-1 min-h-0">
                            <Terminal
                                output={terminalOutput}
                                onInput={handleTerminalInput}
                                onClear={clearTerminal}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
