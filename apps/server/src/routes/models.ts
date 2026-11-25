import { Hono } from "hono";
import { availableModels, defaultModelId } from "../lib/providers.js";

const models = new Hono();

// Only models whose provider has an API key configured are offered. The
// registry (and the reasoning behind the default) lives in lib/providers.ts.
models.get("/", (c) => {
    return c.json({ models: availableModels(), default: defaultModelId() });
});

export default models;
