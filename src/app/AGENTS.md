# App Router Module

## Module Purpose
Next.js App Router pages and API routes. Entry points for the application.

## Standards
- API routes use standard Request/Response types (no Express-style req/res)
- Error handling returns proper HTTP status codes with JSON error bodies
- SSE streaming for chat endpoint via ReadableStream
- No server-side auth currently (TBD)

## Routes

| Route | Method | Purpose |
|-------|--------|---------|
| / (page.tsx) | GET | Main chat page — client-side React with SSE parsing |
| /api/chat | POST | Streaming chat endpoint — runs agent loop, returns SSE events |
| /api/history | GET | List all conversations |
| /api/history | DELETE | Delete a conversation by ID |
| /api/history/[id] | GET | Get messages for a conversation |

## Known Violations
- page.tsx is 371 lines — exceeds 300-line limit, needs refactor into smaller components
