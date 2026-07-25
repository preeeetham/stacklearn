import { Hono } from "hono";
import { cors } from "hono/cors";
import chat from "./routes/chat.js";
import models from "./routes/models.js";
import health from "./routes/health.js";
import test from "./routes/test.js";

const app = new Hono();

// CORS - allow frontend origin. On Vercel the web app and API share an
// origin, so this is only exercised for cross-origin (e.g. local) callers.
const clientUrl = process.env.CLIENT_URL || "*";

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
app.route("/api/test", test);

// Root
app.get("/", (c) => {
    return c.json({
        name: "StackLearn API",
        version: "1.0.0",
        docs: "https://github.com/stacklearn",
    });
});

export default app;
