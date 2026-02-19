import { Hono } from "hono";
import type { ChatRequest } from "../types/index.js";
import { createSSEStream } from "../lib/sse.js";
import { runAgent } from "../agent/orchestrator.js";

const chat = new Hono();

chat.post("/", async (c) => {
    const body = await c.req.json<ChatRequest>();

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
        return c.json({ error: "messages array is required and must not be empty" }, 400);
    }

    // Validate message format
    for (const msg of body.messages) {
        if (!msg.role || !msg.content) {
            return c.json({ error: "Each message must have 'role' and 'content'" }, 400);
        }
        if (msg.role !== "user" && msg.role !== "assistant") {
            return c.json({ error: "Message role must be 'user' or 'assistant'" }, 400);
        }
    }

    const { readable, writer } = createSSEStream();

    // Run the agent asynchronously — it writes to the SSE stream
    runAgent(body.messages, body.model, writer).catch((error) => {
        console.error("Agent error:", error);
        writer.send({
            type: "error",
            message: error instanceof Error ? error.message : "Unknown agent error",
        });
        writer.close();
    });

    return new Response(readable, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
});

export default chat;
