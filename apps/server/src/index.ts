import { Hono } from "hono";
import { cors } from "hono/cors";
import chat from "./routes/chat.js";
import models from "./routes/models.js";
import health from "./routes/health.js";

const app = new Hono();

// CORS - allow frontend origin
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

app.use(
    "/api/*",
    cors({
        origin: clientUrl,
        allowHeaders: ["Content-Type"],
        allowMethods: ["GET", "POST", "OPTIONS"],
    })
);

// Routes
app.route("/api/chat", chat);
app.route("/api/models", models);
app.route("/api/health", health);

// Root
app.get("/", (c) => {
    return c.json({
        name: "StackLearn API",
        version: "1.0.0",
        docs: "https://github.com/stacklearn",
    });
});

// Start server
const port = Number(process.env.PORT) || 3001;

console.log(`
╔══════════════════════════════════════════╗
║       StackLearn API Server v1.0        ║
║──────────────────────────────────────────║
║  🚀 Running on http://localhost:${port}     ║
║  📡 CORS origin: ${clientUrl.padEnd(22)} ║
╚══════════════════════════════════════════╝
`);

export default {
    port,
    fetch: app.fetch,
};
