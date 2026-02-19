import React, { useState, useRef, useEffect } from "react";
import { useChatStore } from "../../store/chatStore";
import { useModels } from "../../hooks/useModels";

export const ModelSelector: React.FC = () => {
    const { selectedModel, setModel } = useChatStore();
    const { models } = useModels();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const currentModel = models.find((m) => m.id === selectedModel);
    const displayName = currentModel?.name || selectedModel.split("/").pop() || "Select Model";

    return (
        <div className="relative" ref={dropdownRef} id="model-selector">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-800/50 border border-surface-700/50 hover:bg-surface-800 hover:border-surface-600 text-xs text-surface-300 hover:text-surface-100 transition-all duration-200"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-brand-400">
                    <path d="M4.632 3.533A2 2 0 016.577 2h6.846a2 2 0 011.945 1.533l1.976 8.234A3.489 3.489 0 0016 11.5H4c-.476 0-.93.095-1.344.267l1.976-8.234z" />
                    <path fillRule="evenodd" d="M4 13a2 2 0 100 4h12a2 2 0 100-4H4zm11.24 2a.75.75 0 01.75-.75H16a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75h-.01a.75.75 0 01-.75-.75V15zm-2.25-.75a.75.75 0 00-.75.75v.01c0 .414.336.75.75.75H13a.75.75 0 00.75-.75V15a.75.75 0 00-.75-.75h-.01z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{displayName}</span>
                <svg className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-1 w-72 rounded-lg bg-surface-900 border border-surface-700/50 shadow-2xl shadow-black/50 z-50 overflow-hidden animate-slide-up">
                    <div className="p-2 border-b border-surface-800/50">
                        <p className="text-[10px] font-bold text-surface-500 uppercase tracking-wider px-2 py-1">
                            Select Model
                        </p>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-1">
                        {models.map((model) => (
                            <button
                                key={model.id}
                                onClick={() => {
                                    setModel(model.id);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2.5 rounded-md text-xs transition-colors ${selectedModel === model.id
                                        ? "bg-brand-500/15 text-brand-300"
                                        : "text-surface-300 hover:bg-surface-800/50 hover:text-surface-100"
                                    }`}
                            >
                                <div className="font-medium">{model.name}</div>
                                <div className="text-[10px] text-surface-500 mt-0.5">
                                    {model.description}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
