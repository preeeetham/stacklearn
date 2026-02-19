# StackLearn

> 🚀 An AI-powered interactive learning platform that helps developers stay up to date with new tech stacks through conversational explanations and live, runnable playground demos.

![StackLearn](https://img.shields.io/badge/version-1.0.0-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)

## What is StackLearn?

StackLearn is an open-source, locally-runnable web app with two panels:

- **Chat Panel** — A conversational AI agent that explains any tech stack, framework, or tool. If it doesn't already know it, it browses the official docs in real time and synthesizes the explanation.
- **Playground Panel** — A live StackBlitz WebContainers environment that the agent populates with runnable code based on the explanation. Edit and re-run code instantly.

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
│                    │  OpenRouter API    │                   │
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
- An [OpenRouter](https://openrouter.ai/) API key

### 1. Install dependencies

```bash
bun install
```

### 2. Set up environment variables

```bash
cp .env.example apps/server/.env
```

Edit `apps/server/.env` and add your `OPENROUTER_API_KEY`:

```env
OPENROUTER_API_KEY=sk-or-your-key-here
```

### 3. Start development servers

```bash
bun run dev
```

This starts both servers:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Bun |
| Backend | Hono.js |
| Language | TypeScript (strict) |
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| Playground | StackBlitz WebContainers |
| AI | OpenRouter API |
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
│   │       ├── lib/     # OpenRouter client, SSE helpers
│   │       └── types/   # TypeScript types
│   └── web/             # React frontend
│       └── src/
│           ├── components/  # Chat, Playground, Layout
│           ├── hooks/       # useChat, usePlayground, useModels
│           ├── store/       # Zustand stores
│           ├── lib/         # SSE client, WebContainers manager
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
| `OPENROUTER_API_KEY` | ✅ | Your OpenRouter API key |
| `FIRECRAWL_API_KEY` | ❌ | Firecrawl for better doc scraping |
| `DEFAULT_MODEL` | ❌ | Default LLM model (default: `anthropic/claude-3.5-sonnet`) |
| `PORT` | ❌ | Server port (default: `3001`) |
| `CLIENT_URL` | ❌ | Frontend URL for CORS (default: `http://localhost:5173`) |

## Contributing

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

## License

MIT
