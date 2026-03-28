# 🚀 ChainPilot — Web3 AI Agent: Complete Deployment Guide

> **"Stupid-Proof" Edition** — Every step explained. No assumptions made.

---

## 📋 Table of Contents

1. [What You're Deploying](#1-what-youre-deploying)
2. [How Everything Connects (THE IMPORTANT PART)](#2-how-everything-connects)
3. [Prerequisites](#3-prerequisites)
4. [Step 1: Local Development](#4-step-1-local-development)
5. [Step 2: Build Docker Image](#5-step-2-build-docker-image)
6. [Step 3: Push to Registry](#6-step-3-push-to-registry)
7. [Step 4: Deploy to Akash](#7-step-4-deploy-to-akash)
8. [Step 5: Verify Everything Works](#8-step-5-verify-everything-works)
9. [Environment Variables Reference](#9-environment-variables-reference)
10. [Troubleshooting](#10-troubleshooting)
11. [Architecture Deep Dive](#11-architecture-deep-dive)

---

## 1. What You're Deploying

You're deploying **3 containers** that work together as one application:

| Container | Purpose | Public URL | Internal URL |
|-----------|---------|-----------|--------------|
| **app** | Next.js frontend + API + AI agent | `https://your-akash-url.akash.pro` (port 80) | `app:3000` |
| **postgres** | PostgreSQL database | ❌ Not public | `postgres:5432` |
| **pgadmin** | Database management UI | `https://your-akash-url.akash.pro:5050` | `pgadmin:80` |

**The database is NOT exposed to the internet.** Only the app and pgAdmin are public.

---

## 2. How Everything Connects (THE IMPORTANT PART)

This is the section you came for. Here's exactly how the database connects to the frontend:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AKASH NETWORK HOST                           │
│                                                                     │
│  ┌──────────────┐         ┌──────────────┐         ┌────────────┐  │
│  │              │  DNS    │              │  DNS    │            │  │
│  │   POSTGRES   │◄────────│   APP        │────────►│  PGADMIN   │  │
│  │              │  "post- │  (Next.js)   │  "pgad- │            │  │
│  │  Port 5432   │  gres"  │  Port 3000   │  min"   │  Port 80   │  │
│  │              │         │              │         │            │  │
│  │  Stores:     │         │  Reads:      │         │  Connects  │  │
│  │  - Chats     │         │  - Writes    │         │  to Postgres│  │
│  │  - Messages  │         │    chats     │         │  manually  │  │
│  │  - Tool logs │         │  - Reads     │         │  via UI    │  │
│  │              │         │    history   │         │            │  │
│  └──────────────┘         └──────┬───────┘         └────────────┘  │
│                                  │                                │
│                                  │ Port 80 (public)               │
└──────────────────────────────────┼────────────────────────────────┘
                                   │
                                   ▼
                          ┌────────────────┐
                          │  YOUR BROWSER  │
                          │                │
                          │  Sees the chat │
                          │  UI, sends     │
                          │  messages,     │
                          │  gets AI       │
                          │  responses     │
                          └────────────────┘
```

### The Connection Explained in Plain English

**Step 1:** You type a message in the chat UI in your browser.

**Step 2:** Your browser sends a POST request to `/api/chat` on the **app** container.

**Step 3:** The API route in Next.js does this:
```
1. Save your message to PostgreSQL  ← DATABASE WRITE
2. Load all previous messages       ← DATABASE READ
3. Send messages to Venice AI
4. Get AI response (possibly with tool calls)
5. Stream response back to browser
6. Save AI response to PostgreSQL    ← DATABASE WRITE
```

**Step 4:** How does the app find PostgreSQL? **Magic DNS.**

Inside the Akash deployment, every container gets a hostname equal to its service name:
- The `postgres` service is reachable at hostname **`postgres`**
- The `app` service is reachable at hostname **`app`**
- The `pgadmin` service is reachable at hostname **`pgadmin`**

So the database connection string in the app is:
```
postgresql://web3agent:changeme-secure-password-2024@postgres:5432/web3agent
                                                  ^^^^^^^^                ^^^^
                                                  |                       |
                                                  hostname (not IP!)      port
```

**That's it.** `postgres` is the hostname. Not an IP address. Not `localhost`. Just `postgres`.

### The Code Path (Follow Along in the Source)

```
src/app/page.tsx          ← Chat UI (React component in your browser)
  │
  │  fetch('/api/chat', { ... })   ← User sends message
  ▼
src/app/api/chat/route.ts          ← API route (runs on the server)
  │
  ├──► src/lib/prisma.ts           ← Prisma client (how we talk to DB)
  │      │
  │      │  new PrismaClient()      ← Reads DATABASE_URL env var
  │      │  │
  │      │  └──► DATABASE_URL=postgresql://...@postgres:5432/web3agent
   │      │                              ^^^^^^^^ = hostname!
  │      │
  │      ├── prisma.message.create()   ← Save user message
  │      ├── prisma.message.findMany() ← Load chat history
  │      └── prisma.message.create()   ← Save AI response
  │
  ├──► src/lib/agent.ts              ← AI agent loop
  │      │
  │      ├──► src/lib/venice.ts       ← Venice AI client
  │      │      └──► https://api.venice.ai/v1  (external API)
  │      │
  │      └──► src/lib/toolRunner.ts   ← Runs Web3 tools
  │             └──► src/lib/tools/*.ts  ← ethers.js → blockchain RPCs
  │
  └──► Stream SSE events back to browser
```

### Why This Works (and What Could Break It)

| ✅ Correct | ❌ Wrong | Why |
|---|---|---|
| `postgres:5432` in DATABASE_URL | `localhost:5432` | `localhost` means "this container" — but PostgreSQL is in a DIFFERENT container |
| Service name `postgres` in SDL | Random hostname | Akash uses the SDL service name as the DNS hostname |
| `to: - service: app` in postgres expose | `to: - global: true` for postgres | This would expose your DB to the entire internet |
| Same Akash deployment | Two separate deployments | Internal DNS only works within ONE deployment |

---

## 3. Prerequisites

| Tool | Why | Install |
|------|-----|---------|
| **Node.js 20+** | Build the Next.js app | https://nodejs.org |
| **Docker** | Build container image | https://docs.docker.com/get-docker/ |
| **Akash CLI** | Deploy to Akash Network | See below |
| **Venice API Key** | AI provider | https://venice.ai → Account → API Keys |
| **Docker Registry** | Store your built image | Docker Hub, GHCR, or any OCI registry |
| **AKT tokens** | Pay for Akash deployment | Buy on Osmosis, Celestia, etc. |

### Install Akash CLI

```bash
# Install (macOS)
brew install akash

# Install (Linux)
curl -sSL https://raw.githubusercontent.com/akash-network/node/main/install.sh | sh

# Verify
akash version
```

### Initialize Akash Wallet

```bash
# Create a new key (save the mnemonic!)
akash keys add my-key

# Check balance (fund this address with AKT)
akash query bank balances $(akash keys show my-key -a)
```

---

## 4. Step 1: Local Development

> **Do this first** to make sure the app works before deploying to Akash.

### 4.1 Install Dependencies

```bash
cd web3-agent-akash
npm install
```

### 4.2 Set Up Local Database

You need PostgreSQL running locally. The easiest way:

```bash
# Using Docker (recommended for local dev)
docker run -d \
  --name local-postgres \
  -e POSTGRES_USER=web3agent \
  -e POSTGRES_PASSWORD=changeme-secure-password-2024 \
  -e POSTGRES_DB=web3agent \
  -p 5432:5432 \
  postgres:16.2-alpine
```

### 4.3 Configure Environment

```bash
cp .env.example .env
```

Edit `.env` — set these values:

```env
# REQUIRED: Your Venice AI API key
VENICE_API_KEY=venice_xxxxxxxxxxxxxxxxxxxx

# For LOCAL dev only (points to your local Docker postgres)
DATABASE_URL=postgresql://web3agent:changeme-secure-password-2024@localhost:5432/web3agent
DIRECT_URL=postgresql://web3agent:changeme-secure-password-2024@localhost:5432/web3agent

# RPC URLs work fine as defaults
ETH_RPC_URL=https://eth.llamarpc.com
```

> ⚠️ **NOTE:** For local dev, DATABASE_URL uses `localhost`. For Akash, it uses `postgres`. This is handled automatically by the SDL env vars — you don't need to change it manually.

### 4.4 Initialize Database

```bash
# Create tables
npx prisma db push

# Verify
npx prisma studio   # Opens a browser UI to see your tables
```

### 4.5 Run the App

```bash
npm run dev
```

Open http://localhost:3000 — you should see the ChainPilot chat UI.

Try: **"What's the current gas price on Ethereum?"**

If the agent responds with real gas data → ✅ Everything works locally.

### 4.6 Stop Local Database

```bash
docker stop local-postgres && docker rm local-postgres
```

---

## 5. Step 2: Build Docker Image

```bash
# From the web3-agent-akash directory
docker build -t your-dockerhub-username/web3-agent:v1.0.0 .
```

> **Replace `your-dockerhub-username`** with your actual Docker Hub username.

### What the Build Does (3 stages)

```
Stage 1 (deps):     npm ci — install production dependencies only
Stage 2 (builder):  prisma generate + next build — compile the app
Stage 3 (runner):   Copy built files only — minimal final image (~200MB)
```

### Verify the Image

```bash
docker images | grep web3-agent
# Should show: your-dockerhub-username/web3-agent  v1.0.0  ...  ~200MB
```

---

## 6. Step 3: Push to Registry

### Docker Hub (easiest)

```bash
# Log in
docker login

# Push
docker push your-dockerhub-username/web3-agent:v1.0.0
```

### GitHub Container Registry (GHCR)

```bash
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
docker tag your-dockerhub-username/web3-agent:v1.0.0 ghcr.io/your-github-username/web3-agent:v1.0.0
docker push ghcr.io/your-github-username/web3-agent:v1.0.0
```

---

## 7. Step 4: Deploy to Akash

### 7.1 Update the SDL

Edit `deploy.yml` — change ONE line:

```yaml
# BEFORE (placeholder):
    image: YOUR_REGISTRY/your-username/web3-agent:v1.0.0

# AFTER (your actual image):
    image: your-dockerhub-username/web3-agent:v1.0.0
```

### 7.2 Set Your Venice API Key

The SDL uses `${VENICE_API_KEY}` — you provide this when creating the deployment:

```bash
export VENICE_API_KEY=venice_xxxxxxxxxxxxxxxxxxxx
```

### 7.3 Create Deployment

```bash
# Make sure you're using the right Akash network
export AKASH_NET="mainnet"

# Set your key
export AKASH_KEY_NAME="my-key"

# Create the deployment
akash tx deployment create deploy.yml --from $AKASH_KEY_NAME
```

This outputs a **DSEQ** (deployment sequence number). Save it:

```bash
export DSEQ=123456   # ← use the actual number from output
```

### 7.4 Find Available Providers

```bash
akash provider list
```

Look for providers with:
- High `gpu` or `cpu` available
- Low `pending` (not overloaded)

### 7.5 Accept Bids

```bash
# List bids on your deployment
akash query market bid list --dseq $DSEQ

# Find a bid you want to accept, note the provider address
export PROVIDER="akash1xxxxxxx..."

# Create a lease (accept the bid)
akash tx market lease create --dseq $DSEQ --provider $PROVIDER --from $AKASH_KEY_NAME
```

### 7.6 Send Manifest

```bash
akash provider send-manifest deploy.yml --dseq $DSEQ --provider $PROVIDER --from $AKASH_KEY_NAME
```

### 7.7 Get Your URLs

```bash
akash lease list --dseq $DSEQ
```

You'll see URLs like:
```
Service  URI
app      https://abcdef123456.provider.akash.pro
pgadmin  https://abcdef123456.provider.akash.pro:5050
```

**🎉 That's it! Your app is live!**

---

## 8. Step 5: Verify Everything Works

### 8.1 Check the App

Open the `app` URL in your browser. You should see the ChainPilot chat UI.

### 8.2 Test the AI Agent

Type: **"What's the ETH gas price right now?"**

Expected behavior:
1. You see "⏳ Calling get_gas_price..." (tool call indicator)
2. You see the tool result with real gas data
3. You see the AI's response interpreting the data

If this works → **Database + AI + Blockchain tools all connected.** ✅

### 8.3 Check the Database (via pgAdmin)

1. Open the `pgadmin` URL (port 5050)
2. Login: `admin@web3agent.local` / `pgadmin-password-2024`
3. Click **Add New Server**
4. General tab: Name = "ChainPilot DB"
5. Connection tab:
   - **Host:** `postgres` (the Akash internal hostname!)
   - **Port:** `5432`
   - **Username:** `web3agent`
   - **Password:** `changeme-secure-password-2024`
   - **Database:** `web3agent`
6. Click **Save**
7. Navigate: Servers → ChainPilot DB → Schemas → public → Tables
8. You should see `Conversation` and `Message` tables
9. Right-click `Message` → View/Edit Data → First 100 Rows
10. You should see the messages from your chat!

> **This proves the database connection works.** If you can see your chat messages in pgAdmin, the full stack is connected.

### 8.4 Test Conversation History

1. Start a new chat in the app
2. Send a few messages
3. Refresh the page
4. Your conversations should still be in the sidebar
5. Click an old conversation — all messages should load

> **This proves database persistence works.** Data survives page refreshes.

---

## 9. Environment Variables Reference

### Required

| Variable | Where Set | Description |
|----------|-----------|-------------|
| `VENICE_API_KEY` | Export before deploy + in SDL | Your Venice.ai API key. Get at https://venice.ai |

### Automatic (Set by SDL — DO NOT change)

| Variable | Value | Why |
|----------|-------|-----|
| `DATABASE_URL` | `postgresql://web3agent:...@postgres:5432/web3agent` | Prisma reads this. `postgres` = Akash DNS hostname |
| `DIRECT_URL` | Same as DATABASE_URL | Prisma migrate uses this for direct connections |
| `NODE_ENV` | `production` | Next.js optimization mode |

### Optional (Have sensible defaults)

| Variable | Default | Description |
|----------|---------|-------------|
| `ETH_RPC_URL` | `https://eth.llamarpc.com` | Ethereum RPC endpoint |
| `BSC_RPC_URL` | `https://bsc-dataseed.binance.org` | BSC RPC endpoint |
| `POLYGON_RPC_URL` | `https://polygon-rpc.com` | Polygon RPC endpoint |
| `ARBITRUM_RPC_URL` | `https://arb1.arbitrum.io/rpc` | Arbitrum RPC endpoint |
| `BASE_RPC_URL` | `https://mainnet.base.org` | Base RPC endpoint |
| `SOLANA_RPC_URL` | `https://api.mainnet-beta.solana.com` | Solana RPC endpoint |

> 💡 **Tip:** For production, use your own RPC provider (Alchemy, Infura, QuickNode) instead of public defaults for reliability and rate limits.

---

## 10. Troubleshooting

### "Database connection refused"

**Symptom:** App shows errors about not connecting to PostgreSQL.

**Cause:** The app can't reach the `postgres` hostname.

**Fix:**
1. Verify both services are in the SAME `deploy.yml`
2. Verify the postgres service is named `postgres` (not `db` or `database`)
3. Verify the postgres expose section has `to: - service: app`
4. Wait 30-60 seconds after deployment — PostgreSQL takes time to start
5. Check that `DATABASE_URL` contains `@postgres:` not `@localhost:`

### "Prisma migrate deploy failed"

**Symptom:** App container crashes on startup with migration errors.

**Cause:** The migration SQL doesn't match the schema, or PostgreSQL isn't ready yet.

**Fix:**
1. The migration SQL in `prisma/migrations/0_init/migration.sql` must match `prisma/schema.prisma` exactly
2. If you changed the schema, regenerate: `npx prisma migrate dev --name updated`
3. Copy the new migration SQL into the project before rebuilding the Docker image

### "Venice API key invalid"

**Symptom:** Agent responds with authentication errors.

**Fix:**
1. Verify `VENICE_API_KEY` is set: `echo $VENICE_API_KEY`
2. Get a new key at https://venice.ai
3. The key should start with `venice_`

### "Tool calls return errors"

**Symptom:** Agent tries to call `get_balance` etc. but gets RPC errors.

**Fix:**
1. The default public RPCs can be rate-limited. Set custom RPC URLs in the SDL env vars
2. Test your RPC: `curl -X POST https://eth.llamarpc.com -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'`

### "pgAdmin can't connect to database"

**Symptom:** pgAdmin shows "could not connect to server".

**Fix:**
1. In pgAdmin connection settings, Host must be `postgres` (not `localhost` or an IP)
2. Port must be `5432`
3. Username: `web3agent`, Password: `changeme-secure-password-2024`
4. Make sure you registered the server (Add New Server), not just opened a query tool

### "No bids on my deployment"

**Symptom:** `akash query market bid list` returns empty.

**Fix:**
1. Your pricing might be too low. Try doubling the `amount` values in the SDL
2. Your resource requirements might be too high. Try reducing CPU/memory
3. Wait longer — some providers take a few minutes to bid

---

## 11. Architecture Deep Dive

### Available AI Agent Tools

| Tool | What It Does | Chains |
|------|-------------|--------|
| `get_balance` | Get native token balance for any address | ETH, BSC, Polygon, Arbitrum, Base |
| `get_token_balance` | Get ERC-20 token balance | ETH, BSC, Polygon, Arbitrum, Base |
| `get_gas_price` | Get current gas price + USD estimate | ETH, BSC, Polygon, Arbitrum, Base |
| `get_block_info` | Get block details (timestamp, gas used, etc.) | ETH, BSC, Polygon, Arbitrum, Base |
| `get_token_info` | Get ERC-20 token metadata (name, symbol, supply) | ETH, BSC, Polygon, Arbitrum, Base |
| `get_chain_id` | Get chain ID and latest block info | ETH, BSC, Polygon, Arbitrum, Base |
| `resolve_ens` | Resolve .eth domain to address | Ethereum only |

### Adding a New Tool

1. Create `src/lib/tools/myNewTool.ts`:
```typescript
import { z } from 'zod'

export const myNewToolSchema = z.object({
  param: z.string().describe('What this parameter does'),
})

export async function myNewTool({ toolArgs }: { userMessage: string; toolArgs: z.infer<typeof myNewToolSchema> }) {
  try {
    const { param } = myNewToolSchema.parse(toolArgs)
    // ... your logic ...
    return JSON.stringify({ result: 'some data' })
  } catch (error: any) {
    return JSON.stringify({ error: error.message })
  }
}
```

2. Add to `src/lib/tools/index.ts`:
```typescript
import { myNewToolSchema, myNewTool } from './myNewTool'

export const tools = [
  // ... existing tools ...
  { name: 'my_new_tool', parameters: myNewToolSchema, description: 'Does something useful' },
]

export const toolExecutors: Record<string, any> = {
  // ... existing ...
  my_new_tool: myNewTool,
}
```

3. Rebuild Docker image and redeploy.

### Data Flow Diagram

```
Browser                    Next.js API Route              PostgreSQL           Venice AI
  │                              │                           │                   │
  │── POST /api/chat ──────────►│                           │                   │
  │   { message: "..." }        │                           │                   │
  │                              │── INSERT Message ────────►│                   │
  │                              │   (role: 'user')          │                   │
  │                              │                           │                   │
  │                              │── SELECT Messages ────────►│                   │
  │                              │   (chat history)          │                   │
  │                              │◄── message[] ─────────────│                   │
  │                              │                           │                   │
  │                              │── chat.completions.create ───────────────────►│
  │                              │   (messages + tools)      │                   │
  │                              │                           │                   │
  │                              │◄── response (tool_call) ────────────────────│
  │                              │                           │                   │
  │◄── SSE: tool_call ──────────│                           │                   │
  │                              │                           │                   │
  │                              │── ethers.js ──► Blockchain RPC               │
  │                              │◄── balance data ──                  │
  │                              │                           │                   │
  │◄── SSE: tool_result ────────│                           │                   │
  │                              │                           │                   │
  │                              │── chat.completions.create ───────────────────►│
  │                              │   (with tool result)      │                   │
  │                              │◄── response (text) ──────────────────────────│
  │                              │                           │                   │
  │◄── SSE: text ────────────────│                           │                   │
  │                              │                           │                   │
  │                              │── INSERT Message ────────►│                   │
  │                              │   (role: 'assistant')      │                   │
  │                              │                           │                   │
  │◄── SSE: done ────────────────│                           │                   │
```

### Security Notes

1. **Change the default passwords** in `deploy.yml` before deploying to production
2. **PostgreSQL is not exposed to the internet** — only reachable internally via `to: - service: app`
3. **pgAdmin IS exposed** — change its default password or remove the service if not needed
4. **Venice API key** is passed via env var substitution, not hardcoded in the SDL
5. **No wallet private keys** are stored or handled — the agent is read-only (queries only, no transactions)

---

## Quick Reference Card

```bash
# Local dev
cp .env.example .env && npm i && npx prisma db push && npm run dev

# Build & push
docker build -t USER/web3-agent:v1.0.0 .
docker push USER/web3-agent:v1.0.0

# Deploy
export VENICE_API_KEY=venice_xxx
akash tx deployment create deploy.yml --from my-key
# Get DSEQ from output
akash provider send-manifest deploy.yml --dseq $DSEQ --provider $PROVIDER --from my-key

# Check status
akash lease list --dseq $DSEQ
```

---

*Built with Venice SDK (georgeglarson/venice-dev-tools) • ethers.js v6 • Next.js 14 • Prisma • Akash Network*
