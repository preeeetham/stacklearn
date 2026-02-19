import React, { useState } from "react";
import { Header } from "./components/Layout/Header";
import { ChatPanel } from "./components/Chat/ChatPanel";
import { PlaygroundPanel } from "./components/Playground/PlaygroundPanel";

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<"chat" | "playground">("chat");

    return (
        <div className="h-full flex flex-col bg-surface-950">
            <Header />

            {/* Desktop: side-by-side layout */}
            <div className="flex-1 hidden md:flex overflow-hidden">
                {/* Chat Panel — 40% */}
                <div className="w-[40%] min-w-[320px] border-r border-surface-800/50">
                    <ChatPanel />
                </div>

                {/* Playground Panel — 60% */}
                <div className="flex-1">
                    <PlaygroundPanel />
                </div>
            </div>

            {/* Mobile: tab-based layout */}
            <div className="flex-1 md:hidden flex flex-col overflow-hidden">
                <div className="flex-1 overflow-hidden">
                    {activeTab === "chat" ? <ChatPanel /> : <PlaygroundPanel />}
                </div>

                {/* Bottom tab bar */}
                <div className="flex border-t border-surface-800/50 bg-surface-900/80 backdrop-blur-sm">
                    <button
                        onClick={() => setActiveTab("chat")}
                        className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${activeTab === "chat"
                                ? "text-brand-400"
                                : "text-surface-500"
                            }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M10 3c-4.31 0-8 3.033-8 7 0 2.024.978 3.825 2.499 5.085a3.478 3.478 0 01-.522 1.756.75.75 0 00.584 1.143 5.976 5.976 0 003.936-1.108c.487.082.99.124 1.503.124 4.31 0 8-3.033 8-7s-3.69-7-8-7z" clipRule="evenodd" />
                        </svg>
                        Chat
                    </button>
                    <button
                        onClick={() => setActiveTab("playground")}
                        className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${activeTab === "playground"
                                ? "text-brand-400"
                                : "text-surface-500"
                            }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M6.28 5.22a.75.75 0 010 1.06L2.56 10l3.72 3.72a.75.75 0 01-1.06 1.06L.97 10.53a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 0zm7.44 0a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L17.44 10l-3.72-3.72a.75.75 0 010-1.06zM11.377 2.011a.75.75 0 01.612.867l-2.5 14.5a.75.75 0 01-1.478-.255l2.5-14.5a.75.75 0 01.866-.612z" clipRule="evenodd" />
                        </svg>
                        Playground
                    </button>
                </div>
            </div>
        </div>
    );
};

export default App;
