import app from "./app.js";

// Start server (Bun local dev). On Vercel the app is served via
// api/[[...route]].ts using the hono/vercel adapter instead.
const port = Number(process.env.PORT) || 3001;
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

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
