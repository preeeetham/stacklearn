import { useState, useEffect } from "react";
import type { ModelInfo } from "../types";
import { useChatStore } from "../store/chatStore";

const API_URL = import.meta.env.VITE_API_URL || "";

// Fallback list (Groq models) used only if the /api/models request fails.
const FALLBACK_MODELS: ModelInfo[] = [
    {
        id: "llama-3.3-70b-versatile",
        name: "Llama 3.3 70B Versatile",
        description: "Strong general + coding model. Great default.",
    },
    {
        id: "llama-3.1-8b-instant",
        name: "Llama 3.1 8B Instant",
        description: "Small, extremely fast model for quick iteration.",
    },
];

export function useModels() {
    const [models, setModels] = useState<ModelInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const selectedModel = useChatStore((s) => s.selectedModel);
    const setModel = useChatStore((s) => s.setModel);

    useEffect(() => {
        let cancelled = false;

        // If the persisted model isn't one the backend offers (e.g. a stale
        // OpenRouter id from a previous version), fall back to the first model.
        function reconcile(list: ModelInfo[]) {
            if (list.length === 0) return;
            if (!list.some((m) => m.id === selectedModel)) {
                setModel(list[0].id);
            }
        }

        async function fetchModels() {
            try {
                const response = await fetch(`${API_URL}/api/models`);
                if (response.ok) {
                    const data = (await response.json()) as { models: ModelInfo[] };
                    if (!cancelled) {
                        setModels(data.models);
                        reconcile(data.models);
                    }
                    return;
                }
                throw new Error("bad response");
            } catch {
                if (!cancelled) {
                    setModels(FALLBACK_MODELS);
                    reconcile(FALLBACK_MODELS);
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        fetchModels();
        return () => {
            cancelled = true;
        };
        // Run once on mount; reconcile reads the latest selectedModel via closure.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { models, isLoading };
}
