# Core Library Module

## Module Purpose
Core agent orchestration, type definitions, and infrastructure. This is the central nervous system of the application.

## Key Files

| File | Purpose |
|------|---------|
| agent.ts | Main agent loop — async generator that calls Venice AI, handles tool calls, yields SSE events |
| toolRunner.ts | Tool dispatch — takes OpenAI ToolCall, parses args, routes to correct executor |
| types.ts | Centralized type definitions — AIMessage, ToolFn, ChatMessage, Conversation, Message |
| systemPrompt.ts | Agent system prompt construction — defines agent personality and capabilities |
| prisma.ts | Prisma client singleton — prevents hot-reload connection leaks via globalThis |
| venice.ts | Venice AI client config — OpenAI SDK with Venice baseURL and API key |

## Standards
- All shared types defined in types.ts — no type exports from other modules
- agent.ts uses zodFunction from openai/helpers/zod to format tools
- toolRunner.ts imports toolDefinitions from tools/index.ts (name must match exactly)
- prisma.ts uses globalThis singleton pattern for dev hot-reload safety
- venice.ts reads VENICE_API_KEY from environment

## Dependencies
- tools/index.ts: provides tool definitions and executors to agent.ts and toolRunner.ts
- db/index.ts: provides database access (new — DatabaseInterface pattern)
- types.ts: imported by all other modules in this directory
