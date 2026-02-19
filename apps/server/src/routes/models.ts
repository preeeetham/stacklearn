import { Hono } from "hono";
import type { ModelInfo } from "../types/index.js";

const models = new Hono();

const RECOMMENDED_MODELS: ModelInfo[] = [
    // --- Free Models (confirmed working) ---
    {
        id: "arcee-ai/trinity-large-preview:free",
        name: "🆓 Arcee Trinity Large",
        description: "Fast and capable free model. Recommended for testing. Good at code generation.",
    },
    {
        id: "meta-llama/llama-3.3-70b-instruct:free",
        name: "🆓 Llama 3.3 70B",
        description: "Meta's free 70B model. Strong coding and reasoning capabilities.",
    },
    {
        id: "qwen/qwen3-coder:free",
        name: "🆓 Qwen3 Coder",
        description: "Alibaba's free coding-specialized model. Excellent for code generation.",
    },
    {
        id: "deepseek/deepseek-r1-0528:free",
        name: "🆓 DeepSeek R1",
        description: "DeepSeek's free reasoning model. Deep chain-of-thought analysis.",
    },
    {
        id: "mistralai/mistral-small-3.1-24b-instruct:free",
        name: "🆓 Mistral Small 3.1",
        description: "Mistral's free 24B model. Fast and capable for general tasks.",
    },
    // --- Paid Models ---
    {
        id: "anthropic/claude-sonnet-4",
        name: "Claude Sonnet 4",
        description: "Anthropic's latest model. Excellent for code generation and explanations.",
    },
    {
        id: "anthropic/claude-3.5-sonnet",
        name: "Claude 3.5 Sonnet",
        description: "Anthropic's fast, capable model. Great balance of quality and speed.",
    },
    {
        id: "openai/gpt-4o",
        name: "GPT-4o",
        description: "OpenAI's flagship multimodal model. Strong at coding and reasoning.",
    },
    {
        id: "google/gemini-2.5-pro-preview",
        name: "Gemini 2.5 Pro",
        description: "Google's advanced model with long context. Great for deep dives.",
    },
];

models.get("/", (c) => {
    return c.json({ models: RECOMMENDED_MODELS });
});

export default models;
