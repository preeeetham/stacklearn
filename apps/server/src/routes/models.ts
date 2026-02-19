import { Hono } from "hono";
import type { ModelInfo } from "../types/index.js";

const models = new Hono();

const RECOMMENDED_MODELS: ModelInfo[] = [
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
        id: "openai/gpt-4o-mini",
        name: "GPT-4o Mini",
        description: "Fast and affordable. Good for simple explanations and quick demos.",
    },
    {
        id: "google/gemini-2.5-pro-preview",
        name: "Gemini 2.5 Pro",
        description: "Google's advanced model with long context. Great for deep dives.",
    },
    {
        id: "deepseek/deepseek-chat",
        name: "DeepSeek V3",
        description: "Open-source powerhouse. Excellent value for coding tasks.",
    },
    {
        id: "meta-llama/llama-3.1-405b-instruct",
        name: "Llama 3.1 405B",
        description: "Meta's largest open model. Top-tier coding and reasoning.",
    },
];

models.get("/", (c) => {
    return c.json({ models: RECOMMENDED_MODELS });
});

export default models;
