# ChainPilot

> Multi-chain AI agent chat — query on-chain data across 5+ EVM chains through natural conversation.

ChainPilot is a Web3 AI agent with tool-use capabilities for blockchain interactions. Users chat with an AI that can query balances, gas prices, ENS names, token info, funding rates, and block data — all through a clean terminal-style interface.

## ✨ Features

- **Multi-chain support** — Ethereum, BSC, Polygon, Arbitrum, Base, Solana
- **AI-powered chat** — Venice AI (llama-3.3-70b) with OpenAI-compatible SDK
- **On-chain tools** — balances, gas prices, ENS resolution, token info, funding rates, block data
- **Funding rate strategy** — compare venues, calculate PnL, get actionable recommendations
- **Dark terminal aesthetic** — Tailwind CSS with IDE-inspired design
- **PostgreSQL persistence** — chat history, agent sessions, tool call logs via Prisma ORM
- **Wallet auth** — Privy for seamless Web3 wallet connection

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, standalone output) |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL + Prisma ORM |
| Styling | Tailwind CSS |
| AI | Venice AI (llama-3.3-70b) |
| Blockchain | ethers.js v6 |
| Validation | Zod |
| Auth | Privy |

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Venice AI API key ([venice.ai](https://venice.ai))
- Privy app credentials ([dashboard.privy.io](https://dashboard.privy.io))

### Setup

```bash
# Clone the repo
git clone https://github.com/ToXMon/chainpilot.git
cd chainpilot

# Install dependencies
npm ci

# Set up environment
cp .env.example .env
# Edit .env with your keys (see below)

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

See [`.env.example`](.env.example) for the full list. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `VENICE_API_KEY` | ✅ | Venice AI API key |
| `NEXT_PUBLIC_PRIVY_APP_ID` | ✅ | Privy app ID |
| `PRIVY_APP_SECRET` | ✅ | Privy app secret |
| `DATABASE_URL` | Auto | PostgreSQL connection (auto-set on Akash) |
| `NEXTAUTH_SECRET` | ✅ | Random 32-char string for NextAuth |
| Chain RPC URLs | ❌ | Defaults provided for ETH, BSC, POLY, ARB, BASE |

### Local Development (JSON mode)

For local dev without PostgreSQL, set `DATABASE=json` in `.env`. This activates flat-file storage in `/data/`.

## 📐 Architecture

```
src/
├── app/              # Next.js App Router pages + API routes
│   └── api/chat/     # Main chat endpoint (streaming)
├── components/       # React UI (ChatMessage, Sidebar)
├── lib/
│   ├── tools/        # Blockchain interaction tools (11 tools)
│   ├── db/           # Database interface (JSON + Prisma implementations)
│   ├── config/       # Configuration (funding venues, chains)
│   ├── types.ts      # Centralized type definitions
│   └── systemPrompt.ts  # AI system prompt
prisma/               # Database schema + migrations
docs/                 # Design audits, security audits, deployment guides
```

### Tool Interface Pattern

All tools in `src/lib/tools/` follow a consistent interface:
- Export a **Zod schema** for parameter validation
- Export an **executor function**: `async ({ userMessage, toolArgs }) => string`
- Return `JSON.stringify(result)` — always a string
- Wrapped in try/catch returning `{ error: message }` on failure

## 🚢 Deployment

### Docker

```bash
docker build -t chainpilot .
docker run -p 3000:3000 --env-file .env chainpilot
```

### Akash Network

See [`deploy.yml`](deploy.yml) for the full Akash SDL (PostgreSQL + Next.js). See [`docs/DEPLOY.md`](docs/DEPLOY.md) for step-by-step instructions.

1. Push to `main` — CI/CD builds and publishes to GHCR automatically
2. Get the image tag from [GitHub Actions](https://github.com/ToXMon/chainpilot/actions)
3. Update `deploy.yml` with the new tag
4. Set secrets: `VENICE_API_KEY`, `DB_PASSWORD`, `TREASURY_PRIVATE_KEY`, `PRIVY_APP_SECRET`
5. Deploy via Akash CLI

### CI/CD

[`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml) builds and pushes to GHCR on every push to `main`.

## 🧪 Testing

```bash
# Run integration tests
npm test
```

Integration tests validate funding rate tools and output structured JSON results to `/data/`.

## 📄 License

Private — All rights reserved.
