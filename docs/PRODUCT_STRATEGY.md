# ChainPilot Product Strategy

> "The AI that has its own wallet."

---

## 1. Viral Positioning

Every AI chatbot in the world is a spectator — it can tell you about your crypto, but it can't touch it. ChainPilot is the first AI agent that actually has a wallet and can do shit onchain. Not "ask me about gas prices" — "hey agent, swap my USDC for ETH and bridge it to Base." That's the mental model. That's the holy shit moment. You don't explain this product — you show a 12-second video and people get it.

---

## 2. Target User Personas

### Persona 1: "CT DeFi Degenerate" — Jake, 28
- **Profile**: 50k followers on CT, runs a small fund, lives in Telegram groups
- **What he'd tweet**: "bro this AI just bridged my ETH to Base and swapped for USDC without me opening a wallet. we're so back @chainpilot"
- **Why he signs up**: Wants to flex being early. Will test the limits immediately — try to drain the wallet, try weird chains, try to break it. If it survives his chaos testing, he becomes an unpaid shill.
- **What he actually needs**: Speed. If the agent takes 15 seconds to respond, he's gone.

### Persona 2: "Builder in the Trenches" — Priya, 31
- **Profile**: Smart contract dev, active on Farcaster, builds on Base
- **What she'd tweet**: "ERC-4337 + AI agent = the UX problem is solved. No more 'connect wallet' modals. This is what account abstraction was made for."
- **Why she signs up**: Technical curiosity. She wants to see how the paymaster works, how the agent signs, what the permission model looks like. She'll write a thread about the architecture if it's clean.
- **What she actually needs**: Transparency. Show her the transaction before it executes. She trusts code she can inspect.

### Persona 3: "AI-Curious Normie" — Marcus, 35
- **Profile**: Uses ChatGPT daily, bought $200 of BTC on Coinbase once, follows AI accounts on Twitter
- **What he'd tweet**: "I just told an AI to send crypto and it actually worked??? this feels illegal"
- **Why he signs up**: The demo video. He doesn't understand ERC-4337 and doesn't care. He just wants to see if the AI can actually do it.
- **What he actually needs**: To not lose money. Gas sponsorship is mandatory — asking him to fund a wallet kills the funnel at step 1.

---

## 3. The Demo Flow

**Frame 1 (0-2s)**: Dark terminal UI. Chat bubble: "Send 5 USDC to vitalik.eth on Base." Green cursor blinking.

**Frame 2 (2-4s)**: Agent responds: "I'll send 5 USDC to vitalik.eth (0xd8dA...6045) on Base. Let me check your balance first." Tool card expands — `get_token_balance` fires, shows result: "USDC: 12.43".

**Frame 3 (4-6s)**: Agent: "You have 12.43 USDC. Here's the transaction:" — a clean card appears showing: To: vitalik.eth, Amount: 5 USDC, Chain: Base, Gas: ~$0.02 (sponsored). Big green **"Execute"** button.

**Frame 4 (6-8s)**: User clicks Execute. Spinner. Then: **"Transaction confirmed"** with a green checkmark and an Etherscan link.

**Frame 5 (8-10s)**: Agent: "Done. 5 USDC sent to vitalik.eth on Base. Tx: 0xabc... [Etherscan]. You have 7.43 USDC remaining."

**Frame 6 (10-12s)**: Zoom out. The whole thing took 10 seconds. No MetaMask. No seed phrase. No gas token. Text overlay: **"ChainPilot — The AI with a wallet."**

That's it. 12 seconds. No narration. No explanation. The product speaks for itself.

---

## 4. Feature Priorities

| Priority | Feature | Why |
|----------|---------|-----|
 **P0** | Smart wallet creation (ERC-4337,Alchemy Account Kit) | The entire product hinges on this. Nothing else matters until this works. |
 **P0** | Email signup → wallet mapping | The funnel. No auth = no wallet = no demo. |
 **P0** | `send_token` tool | The demo requires ONE write action. This is it. |
 **P0** | Gas sponsorship via paymaster | Normies won't fund gas. Period. |
 **P0** | Transaction confirmation UI | Users need to see and approve before the agent spends. Trust gate. |
 **P1** | `swap_token` tool (via 1inch/0x API) | Second demo moment. "Swap my USDC for ETH" is the natural follow-up. |
 **P1** | Transaction history in sidebar | Users need to see what the agent did. Paranoia reducer. |
 **P1** | Multi-chain wallet (same address across chains) | ERC-4337 makes this trivial. Ship it. |
 **P2** | `bridge_token` tool (via Across/LiFi) | "Bridge my ETH to Base" — powerful but adds API dependency. |
 **P2** | Spending limits (daily max, per-tx max) | Safety layer. Users set it once, forget it. |
 **P2** | Referral/share link with wallet prefund | Viral loop mechanic. |
 **P3** | Solana support | Cool but zero viral impact vs. getting EVM right. |
 **P3** | Portfolio dashboard | Nice but doesn't drive signups. |
 **P3** | Custom agent persona | Fun but not why people share this. |
 **P3** | Mobile app | Web-first. Mobile is a P3 distraction right now. |
 **P3** | Onchain reputation / soulbound tokens | Cool concept, zero urgency. |

Everything not on this list is P3. Cut it.

---

## 5. Smart Wallet UX Flow

**Step 1 — Landing**: User hits chainpilot.xyz. Sees the terminal UI with one suggested prompt: "Try: Send 5 USDC to vitalik.eth." A subtle CTA in the top-right: **"Get your wallet →"**

**Step 2 — Auth modal**: Click CTA. Minimal modal: email field + "Continue" button. No password. Magic link sent. User clicks link in email — logged in.

**Step 3 — Wallet creation (behind the scenes)**: On first login, backend calls Alchemy Account Kit: `createSmartAccount({ owner: email-derived key })`. Returns a counterfactual address. No onchain transaction yet — the wallet doesn't exist onchain until the first tx.

**Step 4 — Welcome screen**: Modal closes. Chat shows a system message: **"Your wallet is ready: 0xabc...def. I can now send, swap, and bridge tokens for you. Gas is on us."** The address is clickable (links to block explorer).

**Step 5 — Prefund (optional but recommended)**: Below the system message: **"Want to test it? Here's 5 USDC on Base →"** button. This calls a backend endpoint that sends 5 USDC from a treasury wallet to the user's smart wallet. Costs you ~$5 per user. Worth it for the first 1,000 users.

**Step 6 — First action**: User types the suggested prompt or their own. Agent queries balance (existing tool), proposes transaction, user confirms, paymaster sponsors gas, UserOperation goes through the bundler, tx executes.

**ERC-4337 specifics**: Use Alchemy Account Kit or Biconomy for the smart wallet infrastructure. Paymaster configured with a verifiable paymaster (not unrestricted — only sponsor gas for whitelisted target contracts). Bundler: Alchemy's or Stackup's. The UserOperation flow is invisible to the user — they just see "Execute" and "Confirmed."

---

## 6. Agent+Wallet Integration

### New Tools to Build

**`send_token`** — The critical P0:
```
{
  name: "send_token",
  description: "Send ERC-20 tokens from the user's smart wallet",
  parameters: {
    token_address: string,  // or symbol like "USDC"
    to_address: string,     // EOA or ENS
    amount: string,         // in human-readable units ("5.0", not wei)
    chain: "ethereum" | "bsc" | "polygon" | "arbitrum" | "base"
  }
}
```

**`swap_token`** (P1):
```
{
  name: "swap_token",
  description: "Swap one token for another on a DEX",
  parameters: {
    from_token: string,    // symbol or address
    to_token: string,
    amount: string,
    chain: string,
    slippage?: string      // default "0.5"
  }
}
```

### Existing Tools That Change

- **`get_balance`** and **`get_token_balance`**: Default to querying the USER's wallet address (from session), not a random typed address. Keep the ability to query other addresses but make user's wallet the default.
- **`get_gas_price`**: Add estimated USD cost. Remove the hardcoded prices — fetch from CoinGecko API.

### Permission Model

**Phase 1 (Launch): Hard confirm every transaction.** The agent proposes, shows a detailed card (to, amount, gas, USD value), user clicks Execute. No auto-approve. This builds trust.

**Phase 2 (Week 3): Auto-approve with limits.** User sets a daily spend limit (e.g., $50) and per-tx limit (e.g., $10). Transactions under the limit auto-execute with a post-confirmation toast. Over-limit requires explicit approval.

**Phase 3 (Later): Trusted actions whitelist.** Users can whitelist specific recipients or action types. "Always approve Uniswap swaps under $100." This is where it gets scary-good — the agent genuinely operates autonomously within bounds.

**Never**: Auto-approve unlimited transactions. Never remove the transaction history. Never hide what the agent did.

---

## 7. Onboarding Checklist

**0-5s**: Page loads. Dark terminal. Single suggested prompt visible. Top-right: "Get your wallet →" in a muted color that doesn't compete with the chat.

**5-10s**: User reads the prompt. Curious. Types something — maybe "what can you do?" Agent responds with a concise list: "I can check balances, send tokens, and swap tokens on 5 chains. Get a wallet to unlock sending and swapping."

**10-20s**: User clicks "Get your wallet." Modal appears. Email field. They type their email. Click Continue.

**20-30s**: Check email. Click magic link. Page reloads — they're in. System message: "Your wallet: 0xabc...def. Gas is sponsored. Here's 5 USDC to test with."

**30-45s**: User clicks the prefund button. Waits 3 seconds. Sees: "5 USDC received on Base." Balance shown.

**45-60s**: User types: "Send 1 USDC to my friend at 0x123..." Agent checks balance, proposes tx, shows confirmation card. User clicks Execute. Green checkmark. **They just told an AI to send crypto and it worked.**

**60s mark**: Share button appears: "Share your first AI transaction →" Generates a screenshot of the tx confirmation with the ChainPilot branding. This is the viral exit.

---

## 8. Missing Features Audit

### Critical (Blocks Launch)
- **Authentication system** — Currently anyone can use it anonymously. You can't map a wallet to nobody.
- **Smart wallet infrastructure** — ERC-4337 SDK integration, paymaster, bundler. None of this exists yet.
- **At least one write tool** — `send_token`. Without it, the wallet is decorative.
- **Transaction confirmation UI** — The current tool cards are read-only expandable displays. Need an interactive confirm/reject card.
- **Session-wallet binding** — The agent needs to know WHICH wallet to act on per user session.

### Important (Hurts Retention)
- **Error handling for failed transactions** — What happens when a tx reverts? Currently there's no error UX at all.
- **Real-time tx status** — Pending → Confirmed → Finalized. Users will stare at the screen and panic without this.
- **Chain selector** — Users can't pick which chain the agent acts on. It defaults based on... nothing explicit.
- **Token price feeds** — Hardcoded gas prices in `getGasPrice.ts` are embarrassing. Fetch real data.
- **Rate limiting** — No auth means no rate limiting. One person could drain your Venice API credits.

### Nice-to-Have (Polish)
- **Conversation search** — Can't find old chats.
- **Export transaction history** — CSV download of agent actions.
- **Keyboard shortcuts** — Power users want Cmd+K to search, Cmd+N for new chat.
- **Light mode** — Some people don't want to feel like they're in The Matrix.
- **Custom system prompt** — Let power users tweak the agent's personality.

---

## 9. Viral Moment Checklist

| Moment | Why It's Shareable | How to Trigger | What User Sees |
|--------|-------------------|----------------|----------------|
| **First tx confirmation** | "An AI sent crypto for me" is inherently shareable | Auto-prompt share button after first successful tx | Screenshot card: tx details + "I just used an AI agent to send crypto onchain" + ChainPilot logo |
| **Zero-to-wallet in 30 seconds** | Destroys the "crypto is hard" narrative | Timer on signup flow, show "Your wallet was created in 28 seconds" | Badge/trophy: "Wallet created in 28s. No seed phrase. No browser extension." |
| **Agent proposes a tx** | The AI is initiative-taking, not just reactive | Agent suggests a swap when it notices an imbalance | Tool card with "I noticed you have 500 USDC. Want me to swap 200 for ETH?" — makes the AI feel alive |
| **Gas = $0.00** | People love free stuff, especially in crypto | Every tx confirmation shows "Gas: $0.00 (sponsored)" | Green "$0.00" next to every gas estimate — screenshot bait |
| **Cross-chain in one message** | "Bridge to Base" in plain English vs. 5 clicks in a bridge UI | User says "move my ETH to Base" and it just works | Before/after comparison: "What this normally looks like" (screenshot of bridge UI) vs. "What this looks like" (one chat message) |
| **ENS resolution in tx** | Sending to "vitalik.eth" instead of 0xd8dA... feels magical | Agent auto-resolves ENS in send_token | To field shows ENS name with resolved address underneath |

---

## 10. Success Metrics

### Viral Metrics
- **K-factor**: Target 1.5+ by week 4. If it's below 0.8, the share flow is broken.
- **Share rate**: % of users who hit the share button after first tx. Target: 15%. If it's below 5%, the share prompt is poorly timed or the screenshot is ugly.
- **Organic signups from shared links**: Track UTM on share links. Target: 40% of signups come from shares by week 6.

### Engagement Metrics
- **DAU/MAU ratio**: Target 30%+ (product-hunt level stickiness). Below 15% means the demo is cool but there's no reason to return.
- **Messages per session**: Target 4+ (query + agent action + follow-up + reaction). Below 2 means people try one thing and leave.
- **Sessions per user per week**: Target 3+. Below 1.5 means it's a toy, not a tool.
- **Return rate (D7)**: % of users who come back within 7 days. Target: 25%. Below 10% = demo-only product.

### Conversion Metrics
- **Landing → Email entry**: Target 40%. Below 20% = the CTA is invisible or the value prop isn't clear.
- **Email → Wallet created**: Target 90% (magic link flow should be near-frictionless). Below 70% = email delivery issues or confusing modal.
- **Wallet → First transaction**: Target 60%. Below 30% = the prefund isn't working or the agent isn't prompting action.
- **Signup → Share**: Target 15%. Below 5% = share moment isn't engineered well enough.

### Business Metrics
- **Cost per acquired user**: Gas sponsorship ($0.02/tx) + prefund ($5 for first 1k users) + Venice API (~$0.01/msg). Target CPA: under $3 for first 1k users, under $1 at scale.
- **Treasury burn rate**: How fast the prefund USDC drains. Track weekly. If 60% of prefunded users never transact, kill the prefund and test a smaller amount.
- **Paymaster gas costs**: Track per-user. If average is above $0.05/tx, negotiate better bundler rates or restrict to cheaper chains.

---

## The Ruthless Summary

You have a cool read-only Web3 chatbot. Nobody shares a read-only chatbot. The smart wallet is the entire product. Everything else — the UI, the chains, the tools — is table stakes.

Ship P0 and nothing else. Get one person to tweet the 12-second demo. If that doesn't happen, no amount of P2 features will save you. Demo or die.
