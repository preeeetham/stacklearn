import { Hono } from "hono";
import type { ModelInfo } from "../types/index.js";

const models = new Hono();

// Groq-hosted models. All entries below support tool/function calling, which
// this app relies on for the `browse_url` tool. IDs verified against
// https://api.groq.com/openai/v1/models — see https://console.groq.com/docs/models
const RECOMMENDED_MODELS: ModelInfo[] = [
    {
        id: "llama-3.3-70b-versatile",
        name: "Llama 3.3 70B Versatile",
        description:
            "Meta's 70B model. Strong general + coding ability with tool use. Great default. 128K context.",
    },
    {
        id: "llama-3.1-8b-instant",
        name: "Llama 3.1 8B Instant",
        description:
            "Small, extremely fast model for quick iteration. Supports tool use. 128K context.",
    },
    {
        id: "openai/gpt-oss-120b",
        name: "GPT-OSS 120B",
        description:
            "OpenAI's open-weight 120B model. Excellent reasoning and code generation with tool use.",
    },
    {
        id: "openai/gpt-oss-20b",
        name: "GPT-OSS 20B",
        description:
            "Lighter open-weight OpenAI model. Fast, strong at reasoning and coding with tool use.",
    },
    {
        id: "qwen/qwen3.6-27b",
        name: "Qwen3.6 27B",
        description:
            "Alibaba's Qwen model. Strong at reasoning and code generation with tool use.",
    },
];

models.get("/", (c) => {
    return c.json({ models: RECOMMENDED_MODELS });
});

export default models;
