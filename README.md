# StackLearn

> An AI-powered interactive learning platform that helps developers stay up to date with new tech stacks through conversational explanations and live, runnable playground demos.

![StackLearn](https://img.shields.io/badge/version-1.0.0-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)

**Live:** https://stacklearn-two.vercel.app

## What is StackLearn?

StackLearn is an open-source web app you can use online or run locally. You start on a landing page: ask a question (or pick a suggestion) and the app opens a two-panel workspace:

- **Chat Panel** — A conversational AI agent that explains any tech stack, framework, or tool. If it doesn't already know it, it browses the official docs in real time and synthesizes the explanation.
- **Playground Panel** — A live StackBlitz WebContainers environment that the agent populates with runnable code based on the explanation. Edit and re-run code instantly.

The model is picked from the small selector under the prompt box. Light and dark themes are both supported.

## Models

StackLearn talks to OpenAI-compatible APIs. A model only shows up in the picker when its provider's API key is set on the server.

| Provider | Models | Notes |
|---|---|---|
| **NVIDIA NIM** (default) | Nemotron 3 Ultra 550B (default), Mistral Large 4, Nemotron 3.5 Lightning 30B | Free tier: 40 requests/minute. Rate-limited (429) and transient 5xx responses are retried with backoff. |
| **Groq** (optional) | Llama 3.3 70B Versatile, GPT-OSS 120B, Llama 3.1 8B Instant | Fast inference; free tier is capped on tokens per minute. |

One chat turn uses 1–3 requests (more if the agent browses docs). Nemotron 3 Ultra is a reasoning model, so a full turn with a playground typically takes about a minute; the server sends SSE heartbeats so the stream stays open while it thinks.

The provider registry lives in [`apps/server/src/lib/providers.ts`](apps/server/src/lib/providers.ts).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│                                                             │
│   ┌─────────────────┐        ┌──────────────────────────┐  │
│   │   Chat Panel    │        │    Playground Panel       │  │
│   │  (React + SSE)  │◄──────►│  (WebContainers iframe)   │  │
│   └────────┬────────┘        └──────────────────────────┘  │
│            │ HTTP / SSE                                      │
└────────────│────────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────────┐
│              Hono.js Backend (Bun)                          │
│                                                             │
│   POST /api/chat  ──► Agent Orchestrator                    │
│                              │                              │
│                    ┌─────────▼──────────┐                   │
│                    │ NVIDIA NIM / Groq  │                   │
│                    │  (LLM + tools)     │                   │
│                    └─────────┬──────────┘                   │
│                              │                              │
│                    ┌─────────▼──────────┐                   │
│                    │  Firecrawl / fetch │                   │
│                    │  (doc browsing)    │                   │
│                    └────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) installed (`curl -fsSL https://bun.sh/install | bash`)
- An [NVIDIA NIM](https://build.nvidia.com) API key (starts with `nvapi-...`) — the default provider. The free tier allows 40 requests/minute; the server retries rate-limited calls with backoff.
- Optional: a [Groq](https://console.groq.com) API key (starts with `gsk_...`) to enable the Groq models in the model picker

### 1. Install dependencies

```bash
bun install
```

### 2. Set up environment variables

```bash
cp .env.example apps/server/.env
```

Edit `apps/server/.env` and add your `NVIDIA_API_KEY` (and optionally `GROQ_API_KEY`):

```env
NVIDIA_API_KEY=nvapi-your-key-here
```

The default model is NVIDIA's **Nemotron 3 Ultra 550B** (`nvidia/nemotron-3-ultra-550b-a55b`); override it with `DEFAULT_MODEL`.

### 3. Start development servers

```bash
bun run dev
```

This starts both servers:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001

## Playground Features

The Playground Panel supports live editing, in-browser execution, and toast notifications for actions like running and saving code.

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + Enter` | Run (or Stop if already running) |
| `Cmd/Ctrl + S` | Save file to WebContainer |
| `` Cmd/Ctrl + ` `` | Toggle terminal focus |
| `Cmd/Ctrl + W` | Close active tab |

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Bun |
| Backend | Hono.js |
| Language | TypeScript (strict) |
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| UI components | Adapted from [Aceternity UI](https://ui.aceternity.com) (Motion) |
| Playground | StackBlitz WebContainers |
| AI | NVIDIA NIM (default), Groq (optional) |
| State Management | Zustand |
| Code Editor | CodeMirror 6 |
| Terminal | xterm.js |

## Project Structure

```
stacklearn/
├── apps/
│   ├── server/          # Hono.js backend
│   │   └── src/
│   │       ├── agent/   # AI orchestrator, prompts, tools
│   │       ├── routes/  # API routes (chat, models, health)
│   │       ├── lib/     # LLM client, provider registry, SSE helpers
│   │       └── types/   # TypeScript types
│   └── web/             # React frontend
│       └── src/
│           ├── components/  # Landing, Chat, Playground, Layout, ui (Aceternity-based)
│           ├── hooks/       # useChat, usePlayground, useModels
│           ├── store/       # Zustand stores
│           ├── lib/         # SSE client, WebContainers manager, cn()
│           └── types/       # Frontend types
└── docs/
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/chat` | Send chat messages, receive SSE stream |
| `GET` | `/api/models` | List available AI models |
| `GET` | `/api/health` | Health check |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NVIDIA_API_KEY` | ✅* | NVIDIA NIM API key (`nvapi-...`). Default provider. |
| `GROQ_API_KEY` | ❌* | Groq API key (`gsk_...`). Enables the Groq models. |
| `FIRECRAWL_API_KEY` | ❌ | Firecrawl for better doc scraping |
| `DEFAULT_MODEL` | ❌ | Default model (default: `nvidia/nemotron-3-ultra-550b-a55b`, or the first available model) |
| `PORT` | ❌ | Server port (default: `3001`) |
| `CLIENT_URL` | ❌ | Frontend URL for CORS (default: `http://localhost:5173`) |

\* At least one of `NVIDIA_API_KEY` or `GROQ_API_KEY` must be set.

## Deployment (Vercel)

The repo deploys as a single Vercel project: the Vite frontend is served as static files and the Hono API runs as an Edge Function from [`api/[[...route]].ts`](api/[[...route]].ts). Pushes to `main` deploy to production automatically.

1. Import the repo in Vercel (build settings come from [`vercel.json`](vercel.json)).
2. Add `NVIDIA_API_KEY` (and optionally `GROQ_API_KEY`, `FIRECRAWL_API_KEY`) under **Settings → Environment Variables** for Production and Preview.
3. Redeploy after changing environment variables. Existing deployments keep the values they were built with.

## Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

## License

MIT
