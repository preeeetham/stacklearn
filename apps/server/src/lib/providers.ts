import type { ModelInfo, ProviderId } from "../types/index.js";

/**
 * LLM provider registry. Both providers expose an OpenAI-compatible
 * `/chat/completions` endpoint, so one client (lib/llm.ts) drives either —
 * only the base URL, API key and per-provider limits differ.
 */
export interface ProviderConfig {
    id: ProviderId;
    label: string;
    url: string;
    apiKeyEnv: string;
    /**
     * Completion budget per call. NVIDIA NIM's limit is requests-per-minute
     * (not tokens), and its reasoning models spend part of the budget on
     * `reasoning_content`, so it gets more room. Groq's free tier is capped on
     * tokens-per-minute, so it stays at 4096.
     */
    maxTokens: number;
    /** Whether the provider accepts the `parallel_tool_calls` flag. */
    supportsParallelToolCallsFlag: boolean;
}

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
    nvidia: {
        id: "nvidia",
        label: "NVIDIA NIM",
        url: "https://integrate.api.nvidia.com/v1/chat/completions",
        apiKeyEnv: "NVIDIA_API_KEY",
        maxTokens: 8192,
        supportsParallelToolCallsFlag: false,
    },
    groq: {
        id: "groq",
        label: "Groq",
        url: "https://api.groq.com/openai/v1/chat/completions",
        apiKeyEnv: "GROQ_API_KEY",
        maxTokens: 4096,
        supportsParallelToolCallsFlag: true,
    },
};

/**
 * Every model the UI can offer. NVIDIA NIM entries come first: NIM is the
 * default provider. All listed models support tool calling (browse_url).
 * NIM IDs verified against https://integrate.api.nvidia.com/v1/models.
 */
const ALL_MODELS: ModelInfo[] = [
    {
        id: "nvidia/nemotron-3-ultra-550b-a55b",
        name: "Nemotron 3 Ultra 550B",
        description:
            "NVIDIA's flagship reasoning model (550B MoE, 55B active). Best quality with fast, reliable tool use.",
        provider: "nvidia",
    },
    {
        id: "mistralai/mistral-large-4-1t-a52b",
        name: "Mistral Large 4",
        description:
            "Mistral's 1T-parameter MoE. Very strong at code, but slower to first token.",
        provider: "nvidia",
    },
    {
        id: "nvidia/nemotron-3.5-lightning-30b-a3b",
        name: "Nemotron 3.5 Lightning 30B",
        description: "Small, fast NVIDIA model for quick iteration.",
        provider: "nvidia",
    },
    {
        id: "llama-3.3-70b-versatile",
        name: "Llama 3.3 70B Versatile",
        description: "Meta's 70B model on Groq. Strong general + coding ability with tool use.",
        provider: "groq",
    },
    {
        id: "openai/gpt-oss-120b",
        name: "GPT-OSS 120B",
        description: "OpenAI's open-weight 120B model on Groq. Excellent reasoning with tool use.",
        provider: "groq",
    },
    {
        id: "llama-3.1-8b-instant",
        name: "Llama 3.1 8B Instant",
        description: "Small, extremely fast model on Groq.",
        provider: "groq",
    },
];

export const DEFAULT_PROVIDER: ProviderId = "nvidia";
const FALLBACK_DEFAULT_MODEL = "nvidia/nemotron-3-ultra-550b-a55b";

function hasKey(provider: ProviderId): boolean {
    return !!process.env[PROVIDERS[provider].apiKeyEnv];
}

/** Models whose provider has an API key configured on this server. */
export function availableModels(): ModelInfo[] {
    return ALL_MODELS.filter((m) => hasKey(m.provider));
}

/**
 * The default model: DEFAULT_MODEL env override if set, otherwise the first
 * available model (NIM first, falling back to Groq if only GROQ_API_KEY is set).
 */
export function defaultModelId(): string {
    const override = process.env.DEFAULT_MODEL;
    if (override) return override;
    return availableModels()[0]?.id ?? FALLBACK_DEFAULT_MODEL;
}

/**
 * Which provider serves a model. Known IDs come from the registry; an unknown
 * ID (e.g. a custom DEFAULT_MODEL) goes to NIM if its key is set, else Groq.
 */
export function providerForModel(modelId: string): ProviderConfig {
    const known = ALL_MODELS.find((m) => m.id === modelId);
    if (known) return PROVIDERS[known.provider];
    return hasKey(DEFAULT_PROVIDER) ? PROVIDERS[DEFAULT_PROVIDER] : PROVIDERS.groq;
}
