import { Hono } from "hono";
import { createSSEStream } from "../lib/sse.js";

const test = new Hono();

/**
 * Test endpoint that simulates a complete AI response with a playground config.
 * Used to verify the playground UI works without needing a working LLM.
 * 
 * POST /api/test/chat
 */
test.post("/chat", async (c) => {
    const { readable, writer } = createSSEStream();

    // Simulate async response
    (async () => {
        try {
            // Simulate streaming text
            const textChunks = [
                "# Express.js Hello World\n\n",
                "**Express.js** is a minimal web framework for Node.js. ",
                "Here's a simple example:\n\n",
                "```javascript\nimport express from 'express';\nconst app = express();\n\n",
                "app.get('/', (req, res) => {\n  res.send('Hello World!');\n});\n\n",
                "app.listen(3000, () => {\n  console.log('Server running on port 3000');\n});\n```\n\n",
                "This creates a server at `http://localhost:3000` that responds with \"Hello World!\".\n",
            ];

            for (const chunk of textChunks) {
                writer.send({ type: "text", content: chunk });
                // Small delay to simulate streaming
                await new Promise((r) => setTimeout(r, 50));
            }

            // Send playground config
            writer.send({
                type: "playground_config",
                config: {
                    runtime: "node" as const,
                    entry: "index.js",
                    files: {
                        "package.json": JSON.stringify(
                            {
                                name: "express-hello-world",
                                type: "module",
                                dependencies: {
                                    express: "^4.18.2",
                                },
                                scripts: {
                                    start: "node index.js",
                                },
                            },
                            null,
                            2
                        ),
                        "index.js": `import express from 'express';

const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.send('<h1>Hello World!</h1><p>Welcome to Express.js</p>');
});

app.get('/api/greeting', (req, res) => {
  res.json({ message: 'Hello from Express!' });
});

app.listen(PORT, () => {
  console.log(\`Server running on http://localhost:\${PORT}\`);
});
`,
                    },
                    installCommand: "npm install",
                    startCommand: "node index.js",
                    previewPort: 3000,
                },
            });

            writer.send({ type: "done" });
            writer.close();
        } catch (err) {
            writer.send({
                type: "error",
                message: err instanceof Error ? err.message : "Unknown error",
            });
            writer.close();
        }
    })();

    return new Response(readable, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
});

export default test;
