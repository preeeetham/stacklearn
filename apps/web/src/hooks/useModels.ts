import { useState, useEffect } from "react";
import type { ModelInfo } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "";

export function useModels() {
    const [models, setModels] = useState<ModelInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchModels() {
            try {
                const response = await fetch(`${API_URL}/api/models`);
                if (response.ok) {
                    const data = (await response.json()) as { models: ModelInfo[] };
                    setModels(data.models);
                }
            } catch {
                // Use fallback models
                setModels([
                    {
                        id: "anthropic/claude-3.5-sonnet",
                        name: "Claude 3.5 Sonnet",
                        description: "Great balance of quality and speed",
                    },
                    {
                        id: "openai/gpt-4o",
                        name: "GPT-4o",
                        description: "Strong at coding and reasoning",
                    },
                ]);
            } finally {
                setIsLoading(false);
            }
        }

        fetchModels();
    }, []);

    return { models, isLoading };
}
