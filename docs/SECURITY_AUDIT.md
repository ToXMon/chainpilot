# ChainPilot Security Audit
**Date**: 2026-03-25
**Auditor**: Security Department
**Scope**: Pre-launch P0 feature audit
**Risk Rating**: 9/10
**Recommendation**: NO-GO

## Executive Summary

ChainPilot has a solid architectural foundation — the proposal-only transaction design, Prisma parameterized queries, pinned dependencies, and multi-stage Docker build demonstrate competent engineering. However, the application has **zero server-side authentication** on every API endpoint, a **stored XSS vulnerability** in the chat message renderer, and a **treasury private key exposure risk** in error handling. Combined with an IDOR that exposes all user conversations and a race condition in the prefund endpoint, this application cannot be launched in its current state. The most alarming finding is that `@privy-io/server-auth` is installed as a dependency but never imported — the auth infrastructure was planned but never wired in. Fixing the 6 Critical and 6 High findings is a prerequisite for any user-facing deployment.

## Findings

| ID | Severity | File | Finding | Recommendation |
|----|----------|------|---------|----------------|
| SEC-001 | Critical | src/app/api/prefund/route.ts:133 | Treasury private key leakable via error messages | Wrap in generic error; never expose error.message |
| SEC-002 | Critical | src/app/api/chat/route.ts, history/route.ts, history/[id]/route.ts | Zero server-side authentication on all API endpoints | Add Privy verifyToken middleware to all routes |
| SEC-003 | Critical | src/components/ChatMessage.tsx:103 | Stored XSS via dangerouslySetInnerHTML | Replace with React markdown renderer or DOMPurify |
| SEC-004 | Critical | src/app/api/history/route.ts:6 | IDOR: GET /api/history returns ALL conversations | Filter by userId from Privy session |
| SEC-005 | Critical | src/app/api/history/[id]/route.ts:9 | IDOR: GET /api/history/{id} exposes any conversation | Verify conversation ownership before returning |
| SEC-006 | Critical | src/app/api/history/route.ts:31 | IDOR: DELETE /api/history can delete any conversation | Verify ownership before deletion |
| SEC-007 | High | src/app/api/prefund/route.ts:42-114 | Race condition allows double prefund | Use Prisma transaction with atomic upsert-first pattern |
| SEC-008 | High | src/app/api/chat/route.ts:9 | walletAddress from client never validated server-side | Extract from Privy token, ignore client-sent value |
| SEC-009 | High | package.json:25, all API routes | @privy-io/server-auth installed but never used | Implement verifyToken middleware |
| SEC-010 | High | deploy.yml:24,44 | Hardcoded database password in deployment config | Use Akash secrets (${DB_PASSWORD}) |
| SEC-011 | High | deploy.yml:76-85 | pgAdmin exposed to internet with default credentials | Remove pgAdmin or restrict to app service only |
| SEC-012 | High | src/app/api/prefund/route.ts:20 | In-memory rate limit resets on restart, bypassable per-address | Use Redis or DB-backed rate limiting with IP tracking |
| SEC-013 | Medium | src/lib/tools/sendToken.ts:5 | No token address allowlist — arbitrary contract calls | Add allowlist of known-safe tokens; warn on unknown tokens |
| SEC-014 | Medium | deploy.yml:40-58 | TREASURY_PRIVATE_KEY missing from deploy.yml env vars | Add to env with Akash secret reference |
| SEC-015 | Medium | src/lib/agent.ts:17 | Agent while(true) loop has no max iteration guard | Add max iterations counter (e.g., 10 tool calls) |
| SEC-016 | Low | All API routes | Error messages expose internal details via error.message | Return generic error messages; log details server-side only |
| SEC-017 | Info | src/lib/privy.ts:4 | NEXT_PUBLIC_PRIVY_APP_ID must not be a test/default value | Verify at deploy time |

### SEC-001: Treasury Private Key Leakable via Error Messages
**Severity**: Critical
**File**: `src/app/api/prefund/route.ts:133`
**Finding**: The catch block on line 133 returns `error.message` directly to the client. If the `ethers.Wallet` constructor on line 79 throws (e.g., invalid key format), or if any ethers operation fails, the error message can contain the private key string, the treasury address, or internal RPC details. This is a direct secret exfiltration vector.

```typescript
// Line 133 — CURRENT (VULNERABLE)
} catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
}
```

**Impact**: An attacker who sends a malformed request (or triggers any error path) could receive the treasury wallet's private key in the HTTP response, allowing complete treasury drain across all chains.
**Recommendation**: Never expose raw error messages from cryptographic operations. Return a generic error and log the details server-side.
**Fix**:
```typescript
// Replace lines 132-134 with:
} catch (error: any) {
    console.error('[PREFUND ERROR]', error.message)
    return NextResponse.json(
        { error: 'Internal server error. Please try again later.' },
        { status: 500 }
    )
}
```

### SEC-002: Zero Server-Side Authentication on All API Endpoints
**Severity**: Critical
**File**: `src/app/api/chat/route.ts`, `src/app/api/history/route.ts`, `src/app/api/history/[id]/route.ts`, `src/app/api/prefund/route.ts`
**Finding**: None of the four API routes perform any server-side authentication. There is no token validation, no session check, no Privy verification. The `@privy-io/server-auth` package (v1.92.4) is listed in `package.json` line 25 but is **never imported** anywhere in the codebase. Any unauthenticated HTTP client can call all endpoints.

**Impact**: 
- Anyone can create conversations and interact with the AI agent (costing Venice API credits)
- Anyone can read all conversations (SEC-004)
- Anyone can delete any conversation (SEC-006)
- Anyone can request prefunds for arbitrary addresses (SEC-007)
- The entire user data store is publicly accessible

**Recommendation**: Implement a Privy authentication middleware that verifies the access token on every API route.
**Fix**: Create `src/lib/auth.ts`:
```typescript
import { PrivyClient } from '@privy-io/server-auth'
import { NextRequest, NextResponse } from 'next/server'

const privyClient = new PrivyClient(
    process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
    process.env.PRIVY_APP_SECRET!
)

export interface AuthResult {
    userId: string
    walletAddress: string | null
    privyId: string
}

export async function authenticateRequest(req: NextRequest): Promise<AuthResult> {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
        throw new Error('Missing authorization header')
    }
    const token = authHeader.slice(7)
    const claims = await privyClient.verifyAuthToken(token)
    const wallet = claims.wallet?.address || null
    return {
        userId: claims.userId,
        walletAddress: wallet,
        privyId: claims.userId,
    }
}

export function withAuth(handler: Function) {
    return async (req: NextRequest, ctx: any) => {
        try {
            const auth = await authenticateRequest(req)
            return handler(req, ctx, auth)
        } catch (error: any) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    }
}
```

Then apply to each route. Example for `src/app/api/chat/route.ts`:
```typescript
import { withAuth, type AuthResult } from '@/lib/auth'

export const POST = withAuth(async (req: NextRequest, ctx: any, auth: AuthResult) => {
    const { message, conversationId } = await req.json()
    // Use auth.walletAddress instead of client-sent value
    // Use auth.userId to associate conversations
    // ... rest of handler
})
```

On the client side (`src/app/page.tsx`), add the Privy token to all fetch calls:
```typescript
const { getAccessToken } = usePrivy()
// In sendMessage:
const token = await getAccessToken()
const res = await fetch('/api/chat', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ message, conversationId }),
    signal: abortControllerRef.current.signal,
})
```

### SEC-003: Stored XSS via dangerouslySetInnerHTML
**Severity**: Critical
**File**: `src/components/ChatMessage.tsx:13-21,103`
**Finding**: The `formatContent()` function on lines 13-21 performs regex-based markdown-to-HTML conversion, and the result is injected via `dangerouslySetInnerHTML` on line 103. The regex on line 18 converts markdown links `[text](url)` to `<a href="url">` without validating the URL scheme — an attacker can inject `javascript:alert(document.cookie)` as the URL. More critically, the function does not escape HTML entities in the input before applying regex transformations, so raw `<script>` tags or `<img onerror=...>` in the content will pass through unmodified.

The attack chain: user sends a crafted message → LLM echoes or incorporates it → stored as assistant message → rendered with `dangerouslySetInnerHTML` → XSS executes in every viewer's browser.

```typescript
// Line 18 — CURRENT (VULNERABLE)
formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
```

**Impact**: Stored XSS allows an attacker to steal Privy session tokens, redirect users to phishing pages, or perform actions on behalf of logged-in users (including initiating token transfers if a user is logged in with a wallet).
**Recommendation**: Replace the custom `formatContent()` + `dangerouslySetInnerHTML` with a sanitized markdown renderer.
**Fix**: Install `dompurify` and `marked` (or `react-markdown`):
```bash
npm install dompurify marked @types/dompurify
```

Replace `ChatMessage.tsx` lines 13-21 and 98-106:
```typescript
import DOMPurify from 'dompurify'
import { marked } from 'marked'

function renderMarkdown(text: string): string {
    const rawHtml = marked.parse(text, { async: false }) as string
    return DOMPurify.sanitize(rawHtml, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'a', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick'],
        ALLOWED_URI_REGEXP: /^(https?:\/\/|\/|#)/i,  // Block javascript: data: etc.
    })
}

// In the assistant message render (replace lines 98-106):
if (!content) return null

return (
    <div className="flex justify-start mb-4">
        <div className="chat-bubble-assistant">
            <div
                className="text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            />
        </div>
    </div>
)
```

### SEC-004: IDOR — GET /api/history Returns ALL Conversations
**Severity**: Critical
**File**: `src/app/api/history/route.ts:6`
**Finding**: The GET handler on line 6 calls `prisma.conversation.findMany()` with no `where` filter. This returns every conversation in the database, including those belonging to other users, along with the first message preview. The `userId` column exists in the schema but is never queried.

```typescript
// Lines 6-15 — CURRENT (VULNERABLE)
const conversations = await prisma.conversation.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
        messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { content: true, role: true },
        },
    },
})
```

**Impact**: Any unauthenticated user can enumerate all conversations, see titles and message previews, and extract conversation IDs for targeted IDOR on the message endpoint (SEC-005).
**Recommendation**: Filter by the authenticated user's ID. This requires SEC-002 to be fixed first.
**Fix** (after implementing SEC-002 auth middleware):
```typescript
export const GET = withAuth(async (req: NextRequest, ctx: any, auth: AuthResult) => {
    const conversations = await prisma.conversation.findMany({
        where: { userId: auth.userId },
        orderBy: { updatedAt: 'desc' },
        include: {
            messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { content: true, role: true },
            },
        },
    })
    // ... rest of handler
})
```

Additionally, update `src/app/api/chat/route.ts` line 18 to associate conversations with the user:
```typescript
const conversation = await prisma.conversation.create({
    data: {
        title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
        userId: auth.userId,  // ADD THIS
    },
})
```

### SEC-005: IDOR — GET /api/history/{id} Exposes Any Conversation's Messages
**Severity**: Critical
**File**: `src/app/api/history/[id]/route.ts:9`
**Finding**: The GET handler fetches messages by `conversationId: params.id` with no ownership check. UUID v4 IDs are not guessable via brute force, but they leak through SEC-004 (the history list endpoint returns all IDs). Once an attacker has a conversation ID, they can read every message including tool arguments, tool results, and any sensitive data discussed.

**Impact**: Full read access to any user's conversation history, including token balances queried, wallet addresses discussed, and transaction proposals generated.
**Recommendation**: Verify the conversation belongs to the authenticated user before returning messages.
**Fix** (after implementing SEC-002 auth middleware):
```typescript
export const GET = withAuth(async (req: NextRequest, ctx: any, auth: AuthResult) => {
    const conversation = await prisma.conversation.findUnique({
        where: { id: ctx.params.id },
        select: { userId: true },
    })
    if (!conversation || conversation.userId !== auth.userId) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const messages = await prisma.message.findMany({
        where: { conversationId: ctx.params.id },
        orderBy: { createdAt: 'asc' },
    })
    // ... rest of handler
})
```

### SEC-006: IDOR — DELETE /api/history Can Delete Any Conversation
**Severity**: Critical
**File**: `src/app/api/history/route.ts:31`
**Finding**: The DELETE handler accepts a conversation ID from the request body and deletes it with no ownership verification. Any unauthenticated user can wipe any conversation from the database.

**Impact**: Data destruction — an attacker could systematically delete all conversations in the database.
**Recommendation**: Verify ownership before deletion.
**Fix** (after implementing SEC-002 auth middleware):
```typescript
export const DELETE = withAuth(async (req: NextRequest, ctx: any, auth: AuthResult) => {
    const { id } = await req.json()
    if (!id) {
        return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 })
    }

    const conversation = await prisma.conversation.findUnique({
        where: { id },
        select: { userId: true },
    })
    if (!conversation || conversation.userId !== auth.userId) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.message.deleteMany({ where: { conversationId: id } })
    await prisma.conversation.delete({ where: { id } })
    return NextResponse.json({ success: true })
})
```

### SEC-007: Race Condition Allows Double Prefund
**Severity**: High
**File**: `src/app/api/prefund/route.ts:42-114`
**Finding**: The prefund check on lines 42-48 and the mark-as-prefunded upsert on lines 107-114 are not wrapped in a database transaction. Two concurrent requests with the same address can both pass the `isPrefunded` check before either writes the upsert. The on-chain transfer (line 96) executes before the DB write (line 107), so both requests will send 5 USDC.

```typescript
// Lines 42-48: CHECK (not atomic with lines 107-114)
const existingUser = await prisma.user.findUnique({
    where: { walletAddress: address.toLowerCase() },
})
if (existingUser?.isPrefunded) {
    return NextResponse.json({ error: 'This wallet has already been prefunded' }, { status: 400 })
}
// ... 60 lines of on-chain operations ...
// Lines 107-114: WRITE (separate round-trip)
await prisma.user.upsert({ ... isPrefunded: true ... })
```

**Impact**: An attacker can drain the treasury at 2x rate per address. With automation, they could extract significant funds before rate limiting kicks in.
**Recommendation**: Use a Prisma interactive transaction to atomically check-and-set. Better yet, reverse the order — attempt the upsert first with a unique constraint, then send tokens.
**Fix**:
```typescript
// Replace lines 42-48 with atomic upsert-first pattern:
const user = await prisma.user.upsert({
    where: { walletAddress: address.toLowerCase() },
    update: {}, // Don't change anything
    create: {
        walletAddress: address.toLowerCase(),
        isPrefunded: false, // Start as false — not yet funded
    },
})

if (user.isPrefunded) {
    return NextResponse.json({ error: 'This wallet has already been prefunded' }, { status: 400 })
}

// ... existing balance check and transfer logic ...

// After successful transfer, atomically mark as prefunded:
const updated = await prisma.user.updateMany({
    where: {
        walletAddress: address.toLowerCase(),
        isPrefunded: false, // Only update if still false (race condition guard)
    },
    data: { isPrefunded: true },
})

if (updated.count === 0) {
    // Another request beat us — the transfer already went through
    // This is a double-send incident that needs manual reconciliation
    console.error(`[PREFUND RACE] Double prefund detected for ${address}. Manual reconciliation required.`)
}
```

### SEC-008: Client-Sent walletAddress Never Validated Server-Side
**Severity**: High
**File**: `src/app/api/chat/route.ts:9`, `src/app/page.tsx:215`
**Finding**: The client sends `walletAddress` in the POST body (page.tsx line 215), but the server in `chat/route.ts` never reads or validates it. This means: (a) the server has no idea who is making the request, and (b) if this value were ever used for authorization (e.g., associating conversations with wallets), an attacker could spoof any address. Currently this field is silently ignored, but its presence indicates incomplete implementation.

**Impact**: The walletAddress field is dead code that creates a false sense of security. If used in future features without server-side validation, it would enable identity spoofing.
**Recommendation**: Remove the client-sent walletAddress field entirely. Derive the wallet address server-side from the Privy token (see SEC-002 fix).

### SEC-009: @privy-io/server-auth Installed but Never Used
**Severity**: High
**File**: `package.json:25`, all API route files
**Finding**: The `@privy-io/server-auth` package (v1.92.4) is listed as a production dependency but a codebase-wide search shows zero imports of it. The Privy client-side SDK handles login, but without server-side token verification, the login state is purely cosmetic — the server trusts no one and authenticates no one.

**Impact**: This is the root cause of SEC-002, SEC-004, SEC-005, SEC-006, and SEC-008. The auth infrastructure exists as a dependency but was never wired in.
**Recommendation**: See SEC-002 fix for complete implementation.

### SEC-010: Hardcoded Database Password in Deployment Config
**Severity**: High
**File**: `deploy.yml:24,44`
**Finding**: The PostgreSQL password `changeme-secure-password-2024` is hardcoded in plaintext in the deployment configuration. This password is used for both the PostgreSQL service definition (line 24) and the app's DATABASE_URL connection string (line 44). Anyone with access to the deploy.yml (e.g., a public GitHub repo) has full database credentials.

```yaml
# Line 24
- POSTGRES_PASSWORD=changeme-secure-password-2024
# Line 44
- DATABASE_URL=postgresql://web3agent:changeme-secure-password-2024@postgres:5432/web3agent
```

**Impact**: If the deploy.yml is committed to a public repository, the production database is immediately compromised. Even in private repos, hardcoded secrets in config files are a supply chain risk.
**Recommendation**: Use Akash's secret reference syntax (`${SECRET_NAME}`) for all credentials.
**Fix**:
```yaml
postgres:
    image: postgres:16.2-alpine
    env:
        - POSTGRES_USER=web3agent
        - POSTGRES_PASSWORD=${DB_PASSWORD}
        - POSTGRES_DB=web3agent

app:
    image: YOUR_REGISTRY/your-username/web3-agent:v1.0.0
    env:
        - DATABASE_URL=postgresql://web3agent:${DB_PASSWORD}@postgres:5432/web3agent
        - DIRECT_URL=postgresql://web3agent:${DB_PASSWORD}@postgres:5432/web3agent
        - TREASURY_PRIVATE_KEY=${TREASURY_PRIVATE_KEY}
        - TREASURY_USDC_ADDRESS=${TREASURY_USDC_ADDRESS}
        - PRIVY_APP_SECRET=${PRIVY_APP_SECRET}
        # ... other env vars with ${SECRET_NAME} references
```

### SEC-011: pgAdmin Exposed to Internet with Default Credentials
**Severity**: High
**File**: `deploy.yml:76-85`
**Finding**: pgAdmin is exposed globally (`global: true` on line 85) with hardcoded default credentials (`admin@web3agent.local` / `pgadmin-password-2024` on lines 79-80). This provides a web-based PostgreSQL management interface accessible to anyone on the internet.

**Impact**: Anyone who finds the deployment can log into pgAdmin and get full read/write access to the entire database — all conversations, user data, prefund status. This is a complete data breach vector.
**Recommendation**: Remove pgAdmin from production entirely. If needed for debugging, restrict it to the app service only (`service: app` instead of `global: true`) and use Akash secrets for credentials.
**Fix**:
```yaml
# Option A: Remove entirely (recommended for production)
# Delete the entire pgadmin service block and its profile/deployment sections

# Option B: Restrict to internal access only
pgadmin:
    image: dpage/pgadmin4:8.8
    env:
        - PGADMIN_DEFAULT_EMAIL=${PGADMIN_EMAIL}
        - PGADMIN_DEFAULT_PASSWORD=${PGADMIN_PASSWORD}
    expose:
        - port: 80
          to:
            - service: app  # Only accessible from app, not internet
```

### SEC-012: In-Memory Rate Limit Bypassable
**Severity**: High
**File**: `src/app/api/prefund/route.ts:20-65`
**Finding**: The rate limit uses an in-memory `Map` (line 20) that tracks attempts by wallet address only. It resets on server restart (common in containerized deployments), doesn't track IP addresses, and the setTimeout-based cleanup (lines 61-65) has a decrement-only pattern that allows more than 3 attempts if requests arrive in rapid succession before the first setTimeout fires. An attacker can also simply use different addresses.

**Impact**: The rate limit provides minimal protection against treasury drain. An attacker with a script generating fresh addresses can bypass it entirely.
**Recommendation**: Use a database-backed rate limiter (e.g., `rate-limiter-flexible` with PostgreSQL) that tracks both IP and address, survives restarts, and uses proper sliding windows. Also consider a CAPTCHA or proof-of-work challenge.

### SEC-013: No Token Address Allowlist
**Severity**: Medium
**File**: `src/lib/tools/sendToken.ts:5`
**Finding**: The `tokenAddress` parameter accepts any valid Ethereum address. The tool will query metadata from arbitrary contracts and generate transaction proposals for them. If a user is tricked into executing a proposal for a malicious token contract, the `transfer()` call could trigger reentrancy or other exploits.

**Impact**: Limited — the actual transaction requires user confirmation and executes from the user's wallet (not the treasury). However, a malicious token contract could exploit the user's wallet during the transfer call.
**Recommendation**: Maintain an allowlist of well-known tokens (USDC, USDT, ETH, etc.) and require explicit user acknowledgment for unknown tokens. Add a warning in the proposal UI for unlisted tokens.

### SEC-014: TREASURY_PRIVATE_KEY Missing from deploy.yml
**Severity**: Medium
**File**: `deploy.yml:40-58`
**Finding**: The `TREASURY_PRIVATE_KEY` and `TREASURY_USDC_ADDRESS` environment variables are not included in the app service's env block. This means the prefund endpoint will always return the "Treasury wallet not configured" error (line 71-76) in production, making the prefund feature non-functional.

**Impact**: The prefund feature — a core P0 onboarding mechanism — will silently fail in production. Users will see a generic error with no indication of the root cause.
**Recommendation**: Add both variables to deploy.yml using Akash secret references (see SEC-010 fix).

### SEC-015: Agent Infinite Loop Risk
**Severity**: Medium
**File**: `src/lib/agent.ts:17`
**Finding**: The `while(true)` loop on line 17 only breaks when `message.content` is truthy (line 33). If the LLM returns a tool_call, the tool executes, and the loop continues. If a tool consistently returns without the LLM generating text content (e.g., a tool that always errors, causing the LLM to retry indefinitely), the loop never terminates. There is no max iteration counter.

**Impact**: A single chat message could cause the server to spin indefinitely, consuming Venice API credits and blocking the request. In a container with memory/CPU limits, this could cause OOM kills.
**Recommendation**: Add a max iteration counter.
**Fix**:
```typescript
const MAX_TOOL_ROUNDS = 10
let toolRounds = 0

while (true) {
    // ... existing code ...

    if (message.tool_calls) {
        toolRounds++
        if (toolRounds >= MAX_TOOL_ROUNDS) {
            yield { type: 'text', content: 'I\'ve reached my tool call limit for this message. Let me summarize what I found so far.' }
            return messages
        }
        // ... existing tool execution code ...
    }
}
```

### SEC-016: Error Message Information Leakage
**Severity**: Low
**File**: All API routes (`prefund/route.ts:133`, `chat/route.ts:136`, `history/route.ts:27,44`, `history/[id]/route.ts:25`)
**Finding**: Every API route returns `error.message` in the response. These messages can contain Prisma query details, network errors, file paths, and other internal information useful for reconnaissance.

**Impact**: Low — this aids reconnaissance but doesn't directly enable exploitation. The critical case (SEC-001) is handled separately.
**Recommendation**: Return generic error messages to clients; log full details server-side.

### SEC-017: NEXT_PUBLIC_PRIVY_APP_ID Must Not Be Test Value
**Severity**: Info
**File**: `src/lib/privy.ts:4`, `.env.example:21`
**Finding**: The Privy appId is loaded from `NEXT_PUBLIC_PRIVY_APP_ID`. If this is left as the placeholder value `your-privy-app-id-here`, Privy will fail to initialize. If someone accidentally uses a test appId from Privy's docs, users could be authenticating against a test environment.
**Recommendation**: Verify at deploy time that the appId matches the production Privy application. Add a startup check:
```typescript
if (process.env.NEXT_PUBLIC_PRIVY_APP_ID?.includes('your-privy') || process.env.NEXT_PUBLIC_PRIVY_APP_ID?.includes('test')) {
    throw new Error('CRITICAL: Privy appId appears to be a placeholder or test value. Refusing to start.')
}
```

## Positive Findings

1. **Proposal-only transaction design** (`sendToken.ts` returns a proposal, not an execution). The actual transfer only happens after explicit user confirmation via Privy's embedded wallet signer. This is the correct architecture for a Web3 agent handling user funds.

2. **Prisma parameterized queries** throughout. No raw SQL, no string interpolation in queries. SQL injection is effectively mitigated by framework choice.

3. **Pinned dependency versions** in `package.json` (all exact versions, no ranges). This eliminates dependency confusion and reproducibility attacks.

4. **Multi-stage Docker build** (`Dockerfile`) with non-root user (`USER nextjs` on line 54), dev dependencies excluded (`--omit=dev`), and standalone output for minimal attack surface.

5. **Zod schema validation** on all tool inputs (`sendTokenSchema`, `getBalanceSchema`, etc.). Tool arguments are validated before use, preventing malformed input from reaching blockchain RPC calls.

6. **Address validation** with `ethers.isAddress()` on both `tokenAddress` and `toAddress` in `sendToken.ts` (lines 31, 48), preventing malformed address injection.

7. **UUID v4** for conversation and message IDs — cryptographically random, not guessable via enumeration (though leaked through SEC-004).

8. **PostgreSQL scoped to app service** in `deploy.yml` (lines 27-29: `to: service: app`). The database port is not exposed to the internet directly — only pgAdmin is (SEC-011).

9. **Treasury balance check** before sending (line 87-93 of `prefund/route.ts`). Prevents failed transactions if treasury is empty.

10. **ENS resolution restricted to Ethereum mainnet** in `sendToken.ts` (lines 40-41). Prevents ENS-related SSRF on L2 RPCs.

## Dependency Risk

- **All dependencies pinned to exact versions** — no supply chain confusion risk.
- **`postinstall: prisma generate`** is safe and standard — it only generates the Prisma client from the schema, no network calls.
- **No known critical CVEs** in the pinned versions at time of audit. Next.js 14.2.21, ethers 6.13.4, and React 18.3.1 are all recent stable releases.
- **`@privy-io/server-auth@1.92.4`** is a dead dependency — installed but unused. It should either be utilized (see SEC-002) or removed to reduce attack surface.
- **Recommendation**: Run `npm audit` in CI/CD and add a lockfile integrity check (`npm ci` is already used in Dockerfile, which verifies the lockfile).

## Go/No-Go Decision

### **NO-GO**

ChainPilot cannot be launched in its current state. The application has **6 Critical** and **6 High** severity findings that must be resolved before any user-facing deployment.

#### Mandatory conditions for GO:

1. **[CRITICAL]** Implement server-side Privy authentication on ALL API routes (SEC-002). This single fix resolves SEC-004, SEC-005, SEC-006, SEC-008, and SEC-009.
2. **[CRITICAL]** Fix the stored XSS in `ChatMessage.tsx` by replacing `dangerouslySetInnerHTML` with a sanitized markdown renderer (SEC-003).
3. **[CRITICAL]** Fix the error message leakage in the prefund endpoint to prevent private key exposure (SEC-001).
4. **[HIGH]** Fix the prefund race condition with atomic check-and-set (SEC-007).
5. **[HIGH]** Remove hardcoded credentials from `deploy.yml` and use Akash secrets (SEC-010).
6. **[HIGH]** Remove or restrict pgAdmin from internet exposure (SEC-011).
7. **[HIGH]** Add `TREASURY_PRIVATE_KEY` and `TREASURY_USDC_ADDRESS` to deploy.yml (SEC-014).

#### Recommended but not blocking:
- Replace in-memory rate limiting with DB-backed solution (SEC-012)
- Add token address allowlist (SEC-013)
- Add agent loop max iteration guard (SEC-015)
- Sanitize all error messages (SEC-016)

#### Estimated remediation effort:
- Critical/High fixes: **2-3 engineering days** (auth middleware is the bulk of the work)
- Medium/Low fixes: **1 additional day**
- Testing and verification: **1 day**
- **Total: ~4-5 days to launch-ready**
