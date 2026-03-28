# ChainPilot — Web3 AI Agent

## Repo Purpose
Web3 AI agent with tool-use capabilities for blockchain interactions. Users chat with an AI that can query on-chain data (balances, gas prices, ENS names, token info, block data) across 5 EVM chains via read-only tools.

## Tech Stack
- Next.js 14 (App Router, standalone output for Akash deployment)
- TypeScript (strict mode)
- Prisma ORM with PostgreSQL
- Tailwind CSS (dark terminal/IDE aesthetic)
- Venice AI API (llama-3.3-70b via OpenAI-compatible SDK)
- ethers.js v6 for blockchain reads
- Zod for tool parameter validation

## Module Map

| Directory | Purpose |
|-----------|---------|
| src/lib/tools/ | Blockchain interaction tools — each fetches on-chain data |
| src/lib/ | Core agent orchestration, types, infrastructure |
| src/lib/db/ | Database interface + JSON/Prisma implementations |
| src/components/ | React UI components for chat interface |
| src/app/ | Next.js App Router pages and API routes |
| prisma/ | Database schema and migrations |
| docs/ | Design audits, security audits, deployment guides, state diagrams |

## Global Standards
- TypeScript strict mode: no any types, use unknown + explicit cast
- Centralized types: all shared types defined in src/lib/types.ts, no type exports from other modules
- 300-line file limit per file (enforced via ESLint)
- 20-file directory limit (enforced via ESLint)
- No unused imports or variables (ESLint error)
- Functional React components, Tailwind for styling
- Error handling: tools return { error: message } JSON strings, API routes return proper HTTP status codes

## Environment Setup
- DATABASE env var switches between json (local dev/testing) and prisma (production) implementations
- DATABASE=json activates JSON flat-file storage in /data/ directory
- DATABASE=prisma (default) activates PostgreSQL via Prisma
- VENICE_API_KEY required for AI completions
- Chain RPC URLs configurable via ETH_RPC_URL, BSC_RPC_URL, etc.

## Key Patterns

### Tool Interface Pattern
All tools in src/lib/tools/ implement the same interface:
- Export a Zod schema for parameter validation
- Export an executor function with consistent signature: async ({ userMessage, toolArgs }) => string
- Return JSON.stringify(result) — always a string
- Wrapped in try/catch returning { error: message } on failure
- Registered in tools/index.ts via dynamic imports

### Agent Loop Pattern
src/lib/agent.ts implements an async generator:
1. Format tools with zodFunction helper
2. Call Venice AI with messages + tools
3. If text content: yield text event, return
4. If tool_calls: yield tool_call events, execute via toolRunner, push results, loop
5. Max 10 iterations guard

### API Route Handler Pattern
- POST/GET handlers return standard Response objects
- SSE streaming via ReadableStream for chat endpoint
- Error responses use proper HTTP status codes

## Known Violations
- src/app/page.tsx is 371 lines (over 300-line limit) — needs refactor/split
