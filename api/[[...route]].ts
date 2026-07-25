import { handle } from "hono/vercel";
import app from "../apps/server/src/app.js";

// Edge runtime: native, unbuffered SSE streaming for /api/chat.
export const config = {
    runtime: "edge",
};

export default handle(app);
