import React, { useState, useRef, useEffect } from "react";
import { useChatStore } from "../../store/chatStore";
import { useModels } from "../../hooks/useModels";
import type { ProviderId } from "../../types";

const PROVIDER_LABEL: Record<ProviderId, string> = {
    nvidia: "NVIDIA NIM",
    groq: "Groq",
};

/**
 * Compact model picker shown under the prompt box: a quiet text button that
 * opens a menu upward, grouped by provider, with a check on the active model.
 */
export const ModelSelector: React.FC = () => {
    const { selectedModel, setModel } = useChatStore();
    const { models } = useModels();
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
        };
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsOpen(false);
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onClick);
            document.removeEventListener("keydown", onKey);
        };
    }, []);

    const current = models.find((m) => m.id === selectedModel);
    const displayName = current?.name || selectedModel.split("/").pop() || "Select model";

    const groups = (Object.keys(PROVIDER_LABEL) as ProviderId[])
        .map((p) => ({ provider: p, items: models.filter((m) => m.provider === p) }))
        .filter((g) => g.items.length > 0);

    return (
        <div className="relative" ref={ref} id="model-selector">
            <button
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${isOpen ? "bg-surface-800 text-surface-100" : "text-surface-400 hover:bg-surface-800 hover:text-surface-100"}`}
            >
                <span className="font-medium">{displayName}</span>
                <svg className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
            </button>

            {isOpen && (
                <div
                    role="listbox"
                    className="panel panel-solid absolute bottom-full right-0 z-50 mb-2 w-72 overflow-hidden rounded-xl p-1.5 shadow-float-lg animate-slide-up"
                >
                    {groups.map((g, gi) => (
                        <div key={g.provider} className={gi > 0 ? "mt-1.5 border-t border-surface-800 pt-1.5" : ""}>
                            <div className="px-2.5 pb-1 pt-1 text-[11px] text-surface-500">
                                {PROVIDER_LABEL[g.provider]}
                            </div>
                            {g.items.map((model) => {
                                const selected = model.id === selectedModel;
                                return (
                                    <button
                                        key={model.id}
                                        role="option"
                                        aria-selected={selected}
                                        title={model.description}
                                        onClick={() => {
                                            setModel(model.id);
                                            setIsOpen(false);
                                        }}
                                        className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm text-surface-100 transition-colors hover:bg-surface-800"
                                    >
                                        <span className="truncate">{model.name}</span>
                                        {selected && (
                                            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 flex-shrink-0 text-brand-400">
                                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
