import React, { useCallback, useEffect, useRef, useState } from "react";
import { Header } from "./components/Layout/Header";
import { ChatPanel } from "./components/Chat/ChatPanel";
import { PlaygroundPanel } from "./components/Playground/PlaygroundPanel";
import { ToastContainer } from "./components/Layout/Toast";
import { Hero } from "./components/Landing/Hero";
import { Backdrop } from "./components/ui/Backdrop";
import { useChat } from "./hooks/useChat";
import { usePlaygroundStore } from "./store/playgroundStore";

const WIDTH_STORAGE_KEY = "stacklearn-chat-width";
const MIN_WIDTH_PCT = 25;
const MAX_WIDTH_PCT = 70;
const DEFAULT_WIDTH_PCT = 40;

const getStoredWidth = (): number => {
    try {
        const stored = Number(localStorage.getItem(WIDTH_STORAGE_KEY));
        if (stored >= MIN_WIDTH_PCT && stored <= MAX_WIDTH_PCT) return stored;
    } catch {
        // ignore
    }
    return DEFAULT_WIDTH_PCT;
};

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<"chat" | "playground">("chat");
    const [chatWidthPct, setChatWidthPct] = useState(getStoredWidth);
    const [isResizing, setIsResizing] = useState(false);
    const splitContainerRef = useRef<HTMLDivElement>(null);
    const { messages, isLoading, sendMessage, clearMessages } = useChat();
    const hasPlayground = usePlaygroundStore((s) => s.config !== null);
    // Landing hero until the first question; the workspace stays mounted
    // (hidden) underneath so the WebContainer boots while the user types.
    const showHero = messages.length === 0 && !hasPlayground;

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
            const pct = ((e.clientX - rect.left) / rect.width) * 100;
            setChatWidthPct(Math.min(MAX_WIDTH_PCT, Math.max(MIN_WIDTH_PCT, pct)));
        };

        const handlePointerUp = () => {
            setIsResizing(false);
            setChatWidthPct((current) => {
                try {
                    localStorage.setItem(WIDTH_STORAGE_KEY, String(current));
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
    }, [isResizing]);

    const resetWidth = useCallback(() => {
        setChatWidthPct(DEFAULT_WIDTH_PCT);
        try {
            localStorage.setItem(WIDTH_STORAGE_KEY, String(DEFAULT_WIDTH_PCT));
        } catch {
            // ignore
        }
    }, []);

    const tabButton = (tab: "chat" | "playground", label: string, icon: React.ReactNode) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 ${activeTab === tab
                ? "bg-brand-500 text-white"
                : "text-surface-400 hover:text-surface-200"
                }`}
        >
            {icon}
            {label}
        </button>
    );

    return (
        <div className="h-full flex flex-col bg-surface-950 relative overflow-hidden">
            <Backdrop />

            <Header onNewChat={showHero ? undefined : clearMessages} />

            {showHero && <Hero onSend={sendMessage} isLoading={isLoading} />}

            {/* Desktop: side-by-side panels, resizable via the drag handle */}
            <div
                ref={splitContainerRef}
                className={`flex-1 overflow-hidden p-3 relative z-10 animate-fade-in ${showHero ? "hidden" : "hidden md:flex"}`}
            >
                <div
                    style={{ width: `${chatWidthPct}%` }}
                    className="panel min-w-[300px] flex-shrink-0 rounded-3xl overflow-hidden"
                >
                    <ChatPanel />
                </div>

                <div
                    onPointerDown={handleResizeStart}
                    onDoubleClick={resetWidth}
                    title="Drag to resize — double-click to reset"
                    className="w-3 flex-shrink-0 flex items-center justify-center cursor-col-resize group touch-none"
                    id="panel-resizer"
                >
                    <div
                        className={`w-[3px] rounded-full transition-all duration-200 ${isResizing
                            ? "h-24 bg-brand-500"
                            : "h-10 bg-surface-700 group-hover:h-24 group-hover:bg-brand-500"
                            }`}
                    />
                </div>

                <div className="panel flex-1 min-w-[320px] rounded-3xl overflow-hidden">
                    <PlaygroundPanel />
                </div>
            </div>

            {/* Mobile: tab-based layout */}
            <div className={`flex-1 flex-col overflow-hidden p-3 gap-3 relative z-10 ${showHero ? "hidden" : "flex md:hidden"}`}>
                <div className="panel flex-1 overflow-hidden rounded-3xl">
                    {activeTab === "chat" ? <ChatPanel /> : <PlaygroundPanel />}
                </div>

                <div className="flex justify-center flex-shrink-0">
                    <div className="panel inline-flex items-center gap-1 p-1 rounded-full">
                        {tabButton(
                            "chat",
                            "Chat",
                            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M10 3c-4.31 0-8 3.033-8 7 0 2.024.978 3.825 2.499 5.085a3.478 3.478 0 01-.522 1.756.75.75 0 00.584 1.143 5.976 5.976 0 003.936-1.108c.487.082.99.124 1.503.124 4.31 0 8-3.033 8-7s-3.69-7-8-7z" clipRule="evenodd" />
                            </svg>
                        )}
                        {tabButton(
                            "playground",
                            "Playground",
                            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M6.28 5.22a.75.75 0 010 1.06L2.56 10l3.72 3.72a.75.75 0 01-1.06 1.06L.97 10.53a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 0zm7.44 0a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L17.44 10l-3.72-3.72a.75.75 0 010-1.06zM11.377 2.011a.75.75 0 01.612.867l-2.5 14.5a.75.75 0 01-1.478-.255l2.5-14.5a.75.75 0 01.866-.612z" clipRule="evenodd" />
                            </svg>
                        )}
                    </div>
                </div>
            </div>

            <ToastContainer />
        </div>
    );
};

export default App;
