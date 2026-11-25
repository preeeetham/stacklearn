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

const SIDEBAR_STORAGE_KEY = "stacklearn-sidebar-width";
const MIN_SIDEBAR_WIDTH = 140;
const MAX_SIDEBAR_WIDTH = 400;
const DEFAULT_SIDEBAR_WIDTH = 176;

const getStoredSidebarWidth = (): number => {
    try {
        const stored = Number(localStorage.getItem(SIDEBAR_STORAGE_KEY));
        if (stored >= MIN_SIDEBAR_WIDTH && stored <= MAX_SIDEBAR_WIDTH) return stored;
    } catch {
        // ignore
    }
    return DEFAULT_SIDEBAR_WIDTH;
};

export const PlaygroundPanel: React.FC = () => {
    const {
        config,
        files,
        activeFile,
        openTabs,
        isRunning,
        isInstalling,
        isRunnable,
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

    const [sidebarWidth, setSidebarWidth] = useState(getStoredSidebarWidth);
    const [isSidebarResizing, setIsSidebarResizing] = useState(false);
    const mainContentRef = useRef<HTMLDivElement>(null);

    // Keyboard shortcuts
    useKeyboardShortcuts({
        onRun: handleRun,
        onStop: handleStop,
        onSave: handleSave,
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

    // Sidebar (Files) horizontal resize logic
    const handleSidebarResizeStart = useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        setIsSidebarResizing(true);
    }, []);

    useEffect(() => {
        if (!isSidebarResizing) return;

        const handlePointerMove = (e: PointerEvent) => {
            const container = mainContentRef.current;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const width = e.clientX - rect.left;
            setSidebarWidth(Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width)));
        };

        const handlePointerUp = () => {
            setIsSidebarResizing(false);
            setSidebarWidth((current) => {
                try {
                    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(current));
                } catch {
                    // ignore
                }
                return current;
            });
        };

        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);

        return () => {
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
        };
    }, [isSidebarResizing]);

    const clearTerminal = useCallback(() => {
        usePlaygroundStore.getState().clearTerminalOutput();
    }, []);

    // Empty state
    if (!config) {
        return (
            <div className="relative flex h-full items-center justify-center overflow-hidden" id="playground-panel-empty">
                                <div className="relative max-w-sm px-6 text-center animate-fade-in">
                    {/* Skeleton code window */}
                    <div className="panel mx-auto mb-6 w-64 rounded-2xl p-3 text-left ">
                        <div className="space-y-2">
                            <div className="h-1.5 w-1/2 rounded-full bg-brand-500/70" />
                            <div className="h-1.5 w-4/5 rounded-full bg-surface-700" />
                            <div className="h-1.5 w-2/3 rounded-full bg-surface-700" />
                            <div className="h-1.5 w-3/4 rounded-full bg-surface-600" />
                            <div className="h-1.5 w-1/3 rounded-full bg-surface-700" />
                        </div>
                    </div>
                    <h3 className="mb-2 text-base font-medium text-surface-100">Your playground lands here</h3>
                    <p className="text-sm leading-relaxed text-surface-400">
                        Ask about a technology in the chat and a runnable project shows up here, with an editor, a terminal and a live preview.
                    </p>
                    <div className="mt-5 inline-flex items-center gap-2 rounded-full chip px-3 py-1 text-xs text-surface-400">
                        {isBooted ? (
                            <>
                                Sandbox ready
                            </>
                        ) : (
                            <>
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-surface-600/40 border-t-surface-300" />
                                Booting sandbox…
                            </>
                        )}
                    </div>
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
                isRunnable={isRunnable}
                ports={ports}
                activePreviewPort={activePreviewPort}
                previewActive={showPreview}
                onSelectPort={handleSelectPort}
                onRun={handleRun}
                onStop={handleStop}
            />

            {/* Reference-only playground — e.g. a Python-only technology
                falls back to a README.md the model can't actually execute in
                the Node sandbox. Say so plainly instead of leaving the
                learner wondering why Run does nothing. */}
            {!isRunnable && (
                <div
                    className="mx-3 mt-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex-shrink-0"
                    id="playground-reference-only-banner"
                >
                    Reference only: this demo can't run in the browser sandbox. See the files (for example the README) for details.
                </div>
            )}

            {/* Main content */}
            <div ref={mainContentRef} className="flex-1 flex overflow-hidden">
                {/* File tree sidebar */}
                <div
                    style={{ width: `${sidebarWidth}px` }}
                    className="flex-shrink-0 flex flex-col border-r border-surface-800/70 bg-surface-950/30 overflow-hidden"
                >
                    <div className="px-3 pt-3 pb-1.5 text-[10px] font-semibold text-surface-500 uppercase tracking-wider flex-shrink-0">
                        Explorer
                    </div>
                    <div className="flex-1 min-h-0 overflow-hidden">
                        <FileTree
                            files={files}
                            activeFile={activeFile}
                            onSelectFile={showFile}
                        />
                    </div>
                </div>

                {/* Vertical drag handle for sidebar width */}
                <div
                    onPointerDown={handleSidebarResizeStart}
                    onDoubleClick={() => {
                        setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
                        try {
                            localStorage.setItem(SIDEBAR_STORAGE_KEY, String(DEFAULT_SIDEBAR_WIDTH));
                        } catch { /* ignore */ }
                    }}
                    title="Drag to resize — double-click to reset"
                    className="w-2 flex-shrink-0 flex items-center justify-center cursor-col-resize group touch-none"
                    id="sidebar-resizer"
                >
                    <div
                        className={`w-0.5 h-12 rounded-full transition-all duration-200 ${
                            isSidebarResizing
                                ? "bg-brand-500 h-20"
                                : "bg-surface-700 group-hover:bg-brand-500 group-hover:h-20"
                        }`}
                    />
                </div>

                {/* Editor + Bottom panels */}
                <div ref={splitContainerRef} className="flex-1 flex flex-col overflow-hidden">
                    {/* Editor section — the preview overlays this large area when
                        a port is selected (toggled from the toolbar). */}
                    <div style={{ height: `${editorPct}%` }} className="flex flex-col overflow-hidden min-h-0">
                        {/* Multi-tab bar */}
                        <div className="flex items-center gap-0.5 px-2 py-1.5 bg-surface-950/30 border-b border-surface-800/70 overflow-x-auto scrollbar-hide flex-shrink-0">
                            {openTabs.map((tab) => {
                                const isActive = tab === activeFile && !showPreview;
                                const baseName = tab.split("/").pop() || tab;
                                return (
                                    <div
                                        key={tab}
                                        className={`group flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs cursor-pointer transition-all duration-150 flex-shrink-0 ${
                                            isActive
                                                ? "bg-surface-800 border border-surface-700/70 text-surface-50 shadow-[inset_0_-1px_0_rgb(var(--color-brand-500))]"
                                                : "text-surface-500 hover:text-surface-200 hover:bg-surface-800/50 border border-transparent"
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
                                <div className="flex items-center gap-1.5 ml-1 px-2.5 py-1 rounded-lg text-xs bg-surface-800 border border-surface-700/70 text-surface-50 flex-shrink-0">
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
                                    ? "bg-brand-500 w-20"
                                    : "bg-surface-700 group-hover:bg-brand-500 group-hover:w-20"
                            }`}
                        />
                    </div>

                    {/* Bottom panel — always the terminal now that the preview
                        lives in the large editor area above. */}
                    <div style={{ height: `${100 - editorPct}%` }} className="flex flex-col overflow-hidden min-h-0 border-t border-surface-800/70">
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
