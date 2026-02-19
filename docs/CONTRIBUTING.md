# Contributing to StackLearn

Thank you for your interest in contributing to StackLearn! This guide will help you get started.

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `bun install`
3. Set up your `.env`: `cp .env.example apps/server/.env`
4. Start dev servers: `bun run dev`

## How the Agent Works

The AI agent uses a system prompt defined in `apps/server/src/agent/prompts.ts`. Key behaviors:

- The agent always explains a topic first, then provides a runnable code example
- It ends every response with a `<playground_config>` JSON block (parsed by the frontend, not shown to users)
- When unsure about a technology, it uses the `browse_url` tool to read official documentation

### Improving the System Prompt

Edit `apps/server/src/agent/prompts.ts`. Consider:
- Does the prompt produce clear, beginner-friendly explanations?
- Are the generated code examples minimal but realistic?
- Does it correctly decide when to browse documentation?

## How to Add New Models

Edit `apps/server/src/routes/models.ts` and add entries to the `RECOMMENDED_MODELS` array:

```typescript
{
  id: "provider/model-name",
  name: "Display Name",
  description: "Short description of the model's strengths",
}
```

## How to Add Playground Templates

For commonly-asked-about frameworks, you can pre-define playground templates. Create a file in `apps/server/src/agent/templates/` (directory to be created) with a `PlaygroundConfig` object that can be injected into the agent's response when specific technologies are detected.

## Code Style

- TypeScript strict mode everywhere
- No `any` types unless commented with justification
- Use functional React components with hooks
- Zustand for state management
- Prefer composition over inheritance

## Pull Request Process

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Ensure TypeScript compiles: `bun run lint`
4. Test locally: `bun run dev`
5. Submit a pull request with a clear description
