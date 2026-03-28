# ChainPilot Design & Marketing Audit
**Date**: 2026-03-25
**Auditor**: Design & Marketing Department
**Design Score**: 2/10

## Executive Summary

ChainPilot has a functional dark terminal aesthetic that doesn't look embarrassing — the color palette (#0a0a0f base, indigo/purple accents) is appropriate for the Web3 audience, and the layout is structurally sound with a sidebar, chat area, and input bar. The TxConfirmationCard component demonstrates that the team can build interactive transaction UI when motivated. That's where the positives end.

Zero viral moments are engineered into the current UI. Not one. There is no wallet creation timer, no share button after transactions, no prefund CTA, no proactive agent suggestions, and the suggested prompts read like a developer's test checklist rather than hooks designed to make someone screenshot and tweet. The empty state shows "Check my wallet balance at 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" — this is the opposite of viral. The single biggest gap is the complete absence of a post-transaction share mechanism: the product's entire thesis is "an AI sent crypto for me" and yet after a successful transaction, the user sees a green checkmark and an explorer link. No share card. No "Share your first AI transaction" prompt. Nothing. The viral exit ramp does not exist.

The product looks like an internal demo, not a launch-ready consumer product. To reach a score of 7+, five new components need to be built from scratch and three existing components need significant enhancement. The fixes are not ambiguous — every gap maps to a specific line in the strategy doc that was simply not implemented.

## Viral Moment Gap Analysis

### Moment 1: First tx confirmation — "An AI sent crypto for me"
**Current support**: The TxConfirmationCard shows a green checkmark and explorer link on success (TxConfirmationCard.tsx:173-191). That's it.
**What's missing**: Share button, share card generation, any post-tx viral prompt, first-tx detection logic, image generation for social media.
**Specific fix**: After first successful tx, render a `ShareCard` component below the success state containing: (1) a generated card image with tx details + ChainPilot branding, (2) a "Share on Twitter" button that opens a pre-filled tweet, (3) a "Copy image" button. Add `isFirstTx` tracking in page.tsx via localStorage or a backend flag.

### Moment 2: Zero-to-wallet in 30 seconds — Timer on signup
**Current support**: None. The `login()` call in page.tsx:384 has no timing wrapper. No timer UI exists anywhere.
**What's missing**: Timer start on login click, timer stop on wallet address appearance, badge/trophy display, "No seed phrase. No browser extension." subtitle.
**Specific fix**: In page.tsx, wrap the login flow: start `Date.now()` before `login()`, stop when `walletAddress` becomes non-null via a `useEffect`. Render a `WalletCreationBadge` component showing "Wallet created in Xs" with the strategy's subtitle. This requires a state machine: `idle → logging_in → wallet_ready`.

### Moment 3: Agent proposes a tx — Initiative-taking AI
**Current support**: The TxConfirmationCard exists for when the agent proposes, but the trigger is entirely user-initiated. The suggested prompts (page.tsx:51-56) are all passive queries.
**What's missing**: Proactive agent suggestions after balance checks, "I noticed you have X USDC" type messages, contextual action prompts.
**Specific fix**: This is primarily a backend/prompt change, but the UI needs to support it: add a `SuggestedAction` component type that renders as a tappable card with a different visual treatment than the confirmation card — more casual, less committal, with a "Do it" quick-action button.

### Moment 4: Gas = $0.00 — Green "$0.00" screenshot bait
**Current support**: TxConfirmationCard.tsx:133-134 shows `$0.00 (sponsored)` in `text-xs font-medium text-green-400`. It exists but is the same size as every other label.
**What's missing**: Visual prominence — this should be the most eye-catching element on the card. Size, glow, badge treatment.
**Specific fix**: Change to `text-base font-bold text-green-400` with a `bg-green-400/10 px-2.5 py-1 rounded-lg border border-green-400/30` wrapper. Consider adding a subtle `shadow-[0_0_12px_rgba(74,222,128,0.15)]` glow. The "$0.00" should be significantly larger than other field values.

### Moment 5: Cross-chain in one message — "Bridge to Base"
**Current support**: None. No bridge tool exists (P2 per strategy), no bridge UI.
**What's missing**: Everything. This is a future feature but the UI should be designed to accommodate it now.
**Specific fix**: The TxConfirmationCard's chain field should be expanded to support a `fromChain` → `toChain` layout with directional arrow. Add a `CHAIN_COLORS` map: `{ ethereum: '#627EEA', base: '#0052FF', arbitrum: '#28A0F0', polygon: '#8247E5', bsc: '#F3BA2F' }`. Chain badges should use these colors instead of uniform indigo.

### Moment 6: ENS resolution in tx — Sending to "vitalik.eth"
**Current support**: The `toAddressDisplay` field exists in the TransactionProposal interface (TxConfirmationCard.tsx:16) and is used as fallback (line 89). The sendToken tool resolves ENS. But the UI treats it identically to a hex address — same truncation, same styling.
**What's missing**: Visual distinction for ENS names. The magic is in seeing "vitalik.eth" not "0xd8dA...6045".
**Specific fix**: When `toAddressDisplay` ends with `.eth`, render it as `text-sm font-semibold text-white` (not `text-xs font-mono text-dark-text`). Show the resolved hex address below in `text-xs text-dark-muted font-mono`. Add a small ENS avatar placeholder (colored circle with first letter).

## Audit Checklist

| # | Item | Exists | Quality | Gap | Fix |
|---|------|--------|---------|-----|-----|
| 1 | Wallet creation timer | N | 0 | No timer, no measurement, no badge | Add timing state machine in page.tsx around login(). Render WalletCreationBadge component |
| 2 | Share button after first tx | N | 0 | No share mechanism of any kind post-tx | Create ShareCard component with html2canvas image gen + Twitter intent URL |
| 3 | Gas = $0.00 styling | Partial | 2 | Green text exists but text-xs — invisible in screenshots | Upgrade to text-base font-bold with green glow background container |
| 4 | Chain badges | Partial | 1 | Badge exists but same indigo for all 5 chains | Add CHAIN_COLORS map, per-chain badge colors, chain logo SVGs |
| 5 | ENS in tx cards | Partial | 1 | toAddressDisplay field exists but no visual ENS treatment | Conditional render: ENS names get white semibold + hex shown below |
| 6 | Welcome system message | N | 0 | No post-login system message in chat | Inject system message on auth state change with wallet address + prefund CTA |
| 7 | Prefund button | N | 0 | API exists at /api/prefund, zero UI | Add "Claim 5 USDC" button in welcome message, call prefund API |
| 8 | Empty state prompts | Y | 1 | 4 generic queries, zero action-oriented viral prompts | Replace with: "Send 5 USDC to vitalik.eth on Base", "Swap my USDC for ETH", "Bridge ETH to Base", "Check my wallet balance" |
| 9 | Wallet address display | Partial | 1 | Shown in header but not clickable, not copyable, hidden on mobile | Make clickable (explorer link), add copy button, show on mobile via long-press or dedicated row |
| 10 | Transaction success state | Partial | 3 | Green checkmark + explorer link present, share missing | Add ShareCard below success state on first transaction |
| 11 | Dark theme consistency | Y | 4 | Solid dark theme, no white flashes observed | Add `<script>document.documentElement.style.background='#0a0a0f'</script>` in layout.tsx head for preload guard |
| 12 | Mobile responsiveness | Partial | 3 | Basic responsive, but wallet address hidden on mobile, tx card max-w-sm may overflow on 320px | Show address in mobile header, make tx card `max-w-full mx-2` on small screens |
| 13 | Loading states | Partial | 2 | Auth skeleton pulse + typing dots + tx spinner. No chat skeletons | Add skeleton messages (3 pulsing lines) during initial conversation load |
| 14 | Error states | Partial | 2 | Tx error has retry button (good), chat error is generic "try again" | Add specific error messages: network error, rate limit, insufficient balance |
| 15 | Branding | Y | 2 | "ChainPilot" text in 3 places, generic lightning SVG, no real logo, no watermark | Commission a proper logo SVG, add watermark to share card, add favicon |

## Top 5 Changes for Maximum Viral Impact

### Change 1: Post-Transaction Share Card
**Impact**: This is the #1 viral lever. The entire product thesis is "an AI sent crypto for me" — if users can't share that moment with one tap, the viral loop is broken. This single feature could double organic signups.
**Current**: TxConfirmationCard.tsx:173-191 shows green checkmark + explorer link, then nothing.
**Fix**: Create `/src/components/ShareCard.tsx`:

~~~tsx
// Render inside TxConfirmationCard success state, after explorer link
// Only shown for first transaction (tracked via localStorage)
<div className="mt-3 pt-3 border-t border-indigo-500/20">
  <p className="text-xs text-dark-muted text-center mb-2">Your first AI transaction</p>
  <div id="share-card" className="bg-[#0d0d14] rounded-xl p-4 border border-dark-border">
    <div className="flex items-center gap-2 mb-3">
      <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center">
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
      </div>
      <span className="text-xs font-bold text-white">ChainPilot</span>
    </div>
    <p className="text-sm font-semibold text-white mb-1">I just used an AI agent to send crypto onchain</p>
    <div className="flex items-center justify-between text-xs text-[#71717a]">
      <span>{proposal.amount} {proposal.token.symbol} → {truncateAddress(proposal.toAddressDisplay || proposal.toAddress)}</span>
      <span>{CHAIN_LABELS[proposal.chain]}</span>
    </div>
    <div className="mt-2 flex items-center gap-1">
      <span className="text-xs font-bold text-green-400">Gas: $0.00</span>
      <span className="text-xs text-green-400/60">(sponsored)</span>
    </div>
  </div>
  <div className="flex items-center gap-2 mt-3">
    <button onClick={handleShareTwitter} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-[#1DA1F2] hover:bg-[#1a8cd8] rounded-lg transition-colors">
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
      Share on X
    </button>
    <button onClick={handleCopyImage} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-dark-text bg-dark-hover border border-dark-border hover:border-dark-muted rounded-lg transition-colors">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
      Copy Image
    </button>
  </div>
</div>
~~~

The `handleShareTwitter` function constructs: `https://twitter.com/intent/tweet?text=I%20just%20used%20an%20AI%20agent%20to%20send%20crypto%20onchain%20%E2%9A%A1&url=https://chainpilot.xyz`

### Change 2: Wallet Creation Timer Badge
**Impact**: "Wallet created in 28s" is a direct attack on the "crypto is hard" narrative. It's a shareable moment before the user even does anything. This turns the onboarding friction into a feature.
**Current**: page.tsx:384 — `login()` call with no timing. Auth state change is invisible.
**Fix**: In page.tsx, add state and timing logic:

~~~tsx
// Add to state declarations in Home():
const [walletCreationTime, setWalletCreationTime] = useState<number | null>(null)
const [loginStartTime, setLoginStartTime] = useState<number | null>(null)

// Add useEffect to time wallet creation:
useEffect(() => {
  if (authenticated && walletAddress && loginStartTime) {
 const elapsed = Math.round((Date.now() - loginStartTime) / 1000)
    setWalletCreationTime(elapsed)
    setLoginStartTime(null)
  }
}, [authenticated, walletAddress, loginStartTime])

// Modify login button onClick:
<button onClick={() => { setLoginStartTime(Date.now()); login(); }} ...>

// Render badge in empty state after auth, before suggested prompts:
{walletCreationTime && (
  <div className="mb-6 flex flex-col items-center">
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-400/10 border border-green-400/30">
      <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      <span className="text-sm font-bold text-green-400">Wallet created in {walletCreationTime}s</span>
    </div>
    <span className="text-xs text-dark-muted mt-1.5">No seed phrase. No browser extension.</span>
  </div>
)}
~~~

### Change 3: Replace Empty State Prompts with Viral Hooks
**Impact**: The empty state is the first thing unauthenticated visitors see. The current prompts are developer-facing utilities. Viral prompts should demonstrate the product's core value in one tap — ideally triggering the exact demo flow from the strategy.
**Current**: page.tsx:51-56 — four generic queries about gas prices, wallet balances, token info, and ENS resolution.
**Fix**:

~~~tsx
const SUGGESTED_PROMPTS = [
  "Send 5 USDC to vitalik.eth on Base",
  "Swap my USDC for ETH on Ethereum",
  "Bridge my ETH to Base",
  "Check my wallet balance",
]
~~~

Additionally, style the first prompt differently to draw attention:

~~~tsx
{SUGGESTED_PROMPTS.map((prompt, index) => (
  <button
    key={prompt}
    onClick={() => sendMessage(prompt)}
    className={`suggested-prompt ${index === 0 ? 'border-indigo-500/40 bg-indigo-500/5' : ''}`}
  >
    {index === 0 && (
      <span className="inline-flex items-center gap-1 text-xs text-indigo-400 mb-1">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        Try this
      </span>
    )}
    {prompt}
  </button>
))}
~~~

### Change 4: Gas $0.00 Visual Overhaul
**Impact**: "$0.00 (sponsored)" in green is explicitly called out as "screenshot bait" in the strategy. Currently it's `text-xs` — the same size as "To", "Token", and "Chain" labels. It needs to be the visual hero of the confirmation card.
**Current**: TxConfirmationCard.tsx:133-134:
```tsx
<span className="text-xs font-medium text-green-400">$0.00 (sponsored)</span>
```
**Fix**: Replace with:

~~~tsx
{proposal.gasSponsored ? (
  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-400/10 border border-green-400/25 shadow-[0_0_16px_rgba(74,222,128,0.1)]">
    <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    <span className="text-base font-bold text-green-400 tracking-tight">$0.00</span>
    <span className="text-xs text-green-400/60 font-medium">sponsored</span>
  </div>
) : (
  <span className="text-xs text-dark-text">{proposal.estimatedGasUsd}</span>
)}
~~~

### Change 5: Post-Login Welcome System Message with Prefund CTA
**Impact**: The strategy specifies a clear welcome flow: system message with wallet address + "Here's 5 USDC to test with" button. Without this, authenticated users land in the same empty state as unauthenticated users — there's no moment of "your wallet is ready, now do something."
**Current**: page.tsx — after auth, the empty state is identical. No system message, no prefund button.
**Fix**: In page.tsx, add a `useEffect` that injects a welcome message when auth state changes:

~~~tsx
const welcomeInjectedRef = useRef(false)

useEffect(() => {
  if (authenticated && walletAddress && !welcomeInjectedRef.current && messages.length === 0) {
    welcomeInjectedRef.current = true
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: `Your smart wallet is ready: \`${truncateAddress(walletAddress)}\`\n\nI can now send, swap, and bridge tokens for you across 5 chains. Gas is on us.`,
      createdAt: new Date().toISOString(),
    }])
  }
}, [authenticated, walletAddress])
~~~

Then in the empty state, after the welcome message area but before suggested prompts, add the prefund button:

~~~tsx
{authenticated && !isPrefunded && (
  <button
    onClick={handlePrefund}
    disabled={prefunding}
    className="mb-6 flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl transition-all shadow-lg shadow-green-500/20"
  >
    {prefunding ? (
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
    ) : (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
    )}
    {prefunding ? 'Sending...' : 'Claim 5 USDC on Base'}
  </button>
)}
~~~

## Share Card Mockup Spec

This is the image someone tweets. It must work at 1200x675 (Twitter OG) and 1080x1920 (Instagram Story).

### Dimensions
- **Twitter/X**: 1200 x 675px
- **Instagram Story**: 1080 x 1920px (vertical variant)
- Export: PNG at 2x for retina

### Layout (Twitter variant — 1200x675)

**Background**: Solid `#0a0a0f` with a subtle radial gradient overlay — `radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.08) 0%, transparent 60%)`

**Top bar** (y: 32px):
- ChainPilot logo (24x24px, lightning bolt in gradient box) at x: 48px
- "ChainPilot" text at x: 80px — `16px, font-weight: 700, color: #e4e4e7, Inter`
- "chainpilot.xyz" at right — `12px, color: #71717a, Inter`

**Center content** (centered vertically, y ~300px):
- Main headline: "I just used an AI agent" — `32px, font-weight: 800, color: #ffffff, Inter, letter-spacing: -0.02em`
- Sub-headline: "to send crypto onchain" — `32px, font-weight: 800, color: transparent, background: linear-gradient(90deg, #3b82f6, #8b5cf6), background-clip: text, Inter, letter-spacing: -0.02em`
- 32px gap
- Transaction detail row (horizontal flex, centered):
  - Amount pill: `"5 USDC"` — `20px, font-weight: 700, color: #ffffff, bg: rgba(255,255,255,0.06), border: 1px solid #1e1e2e, border-radius: 12px, padding: 8px 20px`
  - Arrow: `→` — `20px, color: #71717a, margin: 0 12px`
  - Recipient pill: `"vitalik.eth"` — `20px, font-weight: 600, color: #e4e4e7, bg: rgba(255,255,255,0.06), border: 1px solid #1e1e2e, border-radius: 12px, padding: 8px 20px`
  - Chain pill: `"Base"` — `14px, font-weight: 600, color: #0052FF, bg: rgba(0,82,255,0.1), border: 1px solid rgba(0,82,255,0.25), border-radius: 8px, padding: 4px 12px`
- 24px gap
- Gas callout: `"Gas: $0.00"` — `24px, font-weight: 800, color: #4ade80` with `"(sponsored)"` in `14px, color: rgba(74,222,128,0.5), font-weight: 500` beside it
- Subtle green glow behind gas text: `box-shadow: 0 0 40px rgba(74,222,128,0.15)`

**Bottom bar** (y: bottom 32px):
- Left: "No seed phrase. No browser extension." — `12px, color: #52525b, Inter`
- Right: Small ChainPilot logo (16x16px) + "chainpilot.xyz" — `12px, color: #52525b`

**Border**: 1px solid `#1e1e2e` around entire card, `border-radius: 16px`

### Typography
- Font family: Inter (variable weight) Headlines: 800 weight, -0.02em letter spacing
- Body: 500-600 weight
- Muted: 400 weight

### Color Tokens
- Background: `#0a0a0f`
- Card/surface: `#12121a`
- Border: `#1e1e2e`
- Primary text: `#e4e4e7`
- Muted text: `#71717a`
- Subtle text: `#52525b`
- Accent blue: `#3b82f6`
- Accent purple: `#8b5cf6`
- Green (gas): `#4ade80`
- Green muted: `rgba(74,222,128,0.5)`
- Base chain: `#0052FF`

## Landing Page Hero Section Spec

This is chainpilot.xyz — where organic traffic lands. Convert or die.

### Layout
- Full viewport height (`min-h-screen`)
- Centered content column, `max-w-4xl mx-auto`
- Navigation bar fixed top: ChainPilot logo left, "Launch App →" button right

### Hero Content (vertically centered)

**Badge** (above headline):
- Inline pill: `bg-indigo-500/10 border border-indigo-500/25 rounded-full px-4 py-1.5`
- Text: "The AI that has its own wallet" — `text-sm font-medium text-indigo-300`
- Subtle pulse animation on the border: `animate-[pulse_3s_ease-in-out_infinite]` on border-color

**Headline** (badge + 24px gap):
- Line 1: "Tell an AI to send crypto." — `text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-[1.1]`
- Line 2: "It actually works." — `text-5xl md:text-7xl font-extrabold bg-gradient-to-r from-[#3b82f6] via-[#8b5cf6] to-[#3b82f6] bg-clip-text text-transparent tracking-tight leading-[1.1] bg-[length:200%_auto] animate-[gradient-shift_4s_ease-in-out_infinite]`

**Subheadline** (headline + 32px gap):
- "No MetaMask. No seed phrase. No gas fees. Just type what you want and the AI agent does it onchain in 10 seconds."
- `text-lg md:text-xl text-[#a1a1aa] max-w-2xl leading-relaxed`

**CTA Row** (subheadline + 40px gap, horizontal flex, gap-16px):
- Primary button: "Launch App →" — `px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-2xl transition-all shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0`
- Secondary button: "Watch the 12s demo" — `px-8 py-4 text-base font-medium text-dark-text bg-dark-card border border-dark-border hover:border-dark-muted rounded-2xl transition-all` with play icon SVG

**Animated Demo** (CTA + 64px gap):
- Faux terminal window: `w-full max-w-2xl bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl overflow-hidden shadow-2xl shadow-black/50`
- Terminal title bar: `h-10 bg-[#12121a] border-b border-[#1e1e2e] flex items-center px-4 gap-2` with 3 colored dots (red/yellow/green, `w-3 h-3 rounded-full`)
- Terminal content: Animated typing sequence that loops every 8 seconds:
  - Frame 1 (0-2s): User message appears character by character: `> Send 5 USDC to vitalik.eth on Base`
  - Frame 2 (2-3s): Agent response fades in: `Checking balance... USDC: 12.43`
  - Frame 3 (3-5s): Tx card slides up from bottom with amount, recipient, chain, gas
  - Frame 4 (5-6s): Execute button pulses green, then tx card transforms to success state
  - Frame 5 (6-8s): Hold on success state, then fade out and restart
- All animation via CSS `@keyframes` — no JS animation library needed
- Terminal font: `font-mono text-sm` with `text-[#4ade80]` for user input, `text-[#e4e4e7]` for agent responses

**Social Proof Bar** (below demo, 48px gap):
- Horizontal flex: "Trusted by builders on" — then 5 chain logos in grayscale (Ethereum, Base, Arbitrum, Polygon, BSC) — `h-6 opacity-40 grayscale hover:opacity-70 hover:grayscale-0 transition-all`

### Background Treatment
- Base: `#0a0a0f`
- Subtle grid pattern: `background-image: linear-gradient(rgba(30,30,46,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(30,30,46,0.3) 1px, transparent 1px); background-size: 60px 60px`
- Top-center radial glow: `radial-gradient(ellipse 800px 400px at 50% -100px, rgba(59,130,246,0.07), transparent)`
- Bottom-right secondary glow: `radial-gradient(ellipse 600px 300px at 80% 100%, rgba(139,92,246,0.05), transparent)`

### Mobile Adaptations (< 768px)
- Headline: `text-4xl`
- Subheadline: `text-base`
- CTA buttons: `w-full` stacked vertically
- Demo terminal: `max-w-full mx-4` with smaller text `text-xs`
- Social proof: wrap to 2 rows

## Missing Components Inventory

Every component that needs to be CREATED (not modified):

1. **`ShareCard.tsx`** — Post-transaction share image generator with Twitter/copy buttons. Uses html2canvas or dom-to-image to capture a styled div as PNG. Includes first-tx detection logic.

2. **`WalletCreationBadge.tsx`** — Displays "Wallet created in Xs" with clock icon and subtitle. Receives elapsed seconds as prop. Animated entrance (scale + fade).

3. **`PrefundButton.tsx`** — "Claim 5 USDC on Base" button with loading state, success state ("5 USDC received!"), and error state. Calls `/api/prefund` endpoint. Tracks `isPrefunded` state.

4. **`WelcomeMessage.tsx`** — System message component for post-auth welcome. Displays wallet address as clickable monospace badge, "Gas is on us" callout, and renders PrefundButton below.

5. **`ChainLogo.tsx`** — SVG chain logos for Ethereum, Base, Arbitrum, Polygon, BSC. 16x16 and 24x24 variants. Used in TxConfirmationCard chain badges and anywhere chains are displayed.

6. **`EnsDisplay.tsx`** — Smart address display that detects `.eth` names and renders them differently: ENS name in white semibold with colored avatar circle, resolved hex in muted mono below. Falls back to standard truncated address for non-ENS.

7. **`SuggestedAction.tsx`** — Lightweight action card for proactive agent suggestions ("I noticed you have 500 USDC. Swap for ETH?"). Different visual treatment from TxConfirmationCard — more casual, rounded-full pill style, quick-action tap. Not a commitment, just a nudge.

8. **`SkeletonMessage.tsx`** — Skeleton loader for chat messages during conversation load. Three pulsing lines of varying widths. Matches chat-bubble-assistant dimensions.

9. **`LandingPage.tsx`** — Entire marketing landing page as specified above. Separate route (`/` or `/landing`) with hero, demo, social proof, and CTA. App lives at `/app` or `/chat`.

10. **`ErrorToast.tsx`** — User-friendly error toast component with specific error types: network error ("Check your connection"), rate limit ("Slow down — try again in 30s"), insufficient balance ("Not enough tokens"), generic fallback. Auto-dismiss with progress bar.

## Color & Typography Recommendations

### Color System (Extended)

| Token | Hex | Usage |
|-------|-----|-------|
| `--dark-bg` | `#0a0a0f` | Page background |
| `--dark-card` | `#12121a` | Cards, sidebar, terminal |
| `--dark-elevated` | `#181825` | Hover states, elevated surfaces (NEW) |
| `--dark-border` | `#1e1e2e` | All borders |
| `--dark-border-hover` | `#2a2a3e` | Border on hover (NEW) |
| `--dark-hover` | `#1a1a2e` | Interactive hover backgrounds |
| `--dark-text` | `#e4e4e7` | Primary text |
| `--dark-text-secondary` | `#a1a1aa` | Secondary text, subheadlines (NEW) |
| `--dark-muted` | `#71717a` | Labels, timestamps |
| `--dark-subtle` | `#52525b` | Disabled, very subtle text (NEW) |
| `--accent-blue` | `#3b82f6` | Primary accent |
| `--accent-purple` | `#8b5cf6` | Secondary accent |
| `--accent-green` | `#4ade80` | Success, gas $0.00 |
| `--accent-red` | `#f87171` | Errors, reject |
| `--accent-yellow` | `#fbbf24` | Warnings, pending states (NEW) |

### Chain Colors (NEW — add to tailwind.config.js)

| Chain | Hex | Tailwind token |
|-------|-----|---------------|
| Ethereum | `#627EEA` | `chain-ethereum` |
| Base | `#0052FF` | `chain-base` |
| Arbitrum | `#28A0F0` | `chain-arbitrum` |
| Polygon | `#8247E5` | `chain-polygon` |
| BSC | `#F3BA2F` | `chain-bsc` |

### Typography System

**Primary font**: Inter (variable weight, via Google Fonts or self-hosted)
- Load weights: 400, 500, 600, 700, 800
- `font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

**Mono font**: JetBrains Mono
- Load weights: 400, 500, 600
- `font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace`
- Already referenced in globals.css but not loaded via @import

### Type Scale

| Element | Size | Weight | Line Height | Tracking |
|---------|------|--------|-------------|----------|
| Landing H1 | `text-5xl md:text-7xl` | 800 | 1.1 | -0.02em |
| Landing H2 | `text-3xl md:text-4xl` | 700 | 1.2 | -0.01em |
| Page title | `text-xl` | 700 | 1.3 | normal |
| Card title | `text-sm` | 600 | 1.4 | normal |
| Body text | `text-sm` | 400 | 1.6 | normal |
| Label | `text-xs` | 500 | 1.4 | 0.01em |
| Mono value | `text-xs` | 500 | 1.5 | normal |
| Gas $0.00 | `text-base` | 800 | 1 | -0.02em |

### Spacing System

Use Tailwind's default 4px grid. Key spacings for consistency:
- Card padding: `p-4` (16px)
- Card gap between fields: `space-y-2.5` (10px)
- Section gaps: `gap-3` (12px) for inline, `gap-4` (16px) for stacked
- Page margins: `px-4` mobile, `px-6` desktop
- Content max-width: `max-w-3xl` (768px) for chat, `max-w-4xl` (896px) for landing

### Add to tailwind.config.js

~~~js
colors: {
  // ... existing dark-* and accent-* tokens ...
  'dark-elevated': 'var(--dark-elevated)',
  'dark-border-hover': 'var(--dark-border-hover)',
  'dark-text-secondary': 'var(--dark-text-secondary)',
  'dark-subtle': 'var(--dark-subtle)',
  'accent-green': 'var(--accent-green)',
  'accent-red': 'var(--accent-red)',
  'accent-yellow': 'var(--accent-yellow)',
  'chain-ethereum': '#627EEA',
  'chain-base': '#0052FF',
  'chain-arbitrum': '#28A0F0',
  'chain-polygon': '#8247E5',
  'chain-bsc': '#F3BA2F',
},
fontSize: {
  'display': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '800' }],
},
~~~

### Add to globals.css :root

~~~css
:root {
  /* ... existing vars ... */
  --dark-elevated: #181825;
  --dark-border-hover: #2a2a3e;
  --dark-text-secondary: #a1a1aa;
  --dark-subtle: #52525b;
  --accent-green: #4ade80;
  --accent-red: #f87171;
  --accent-yellow: #fbbf24;
}

/* Add Inter font import at top of file */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
~~~

### Body font update in globals.css

~~~css
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  /* ... rest unchanged ... */
}
~~~

## Overall Design Score

**2/10**

| Dimension | Score | Notes |
|-----------|-------|-------|
| Visual Polish | 4/10 | Dark theme works, colors are appropriate, but flat — no depth, no glow effects, no visual hierarchy beyond font-size differences |
| Viral Engineering | 1/10 | Zero viral moments are implemented. No share mechanism, no timer, no prefund CTA, no proactive suggestions. The product cannot generate organic shares in its current state |
| Mobile | 3/10 | Basic responsive layout works. Wallet address hidden on mobile. Tx confirmation card may overflow at 320px. No mobile-specific empty state optimization |
| Branding | 2/10 | Text "ChainPilot" appears in 3 places. Lightning bolt SVG is generic. No real logo, no favicon, no share card watermark, no brand guidelines |
| Micro-interactions | 2/10 | Typing indicator (3 dots), button press scale (send-btn:active), sidebar hover opacity. No entrance animations, no success celebrations, no confetti, no haptic-adjacent feedback |

**Path to 7/10**: Implement all 5 Top Changes (+2 points viral, +1 polish), create ShareCard + LandingPage (+1 branding, +1 mobile), add chain colors + ENS display (+1 polish). Estimated effort: 3-4 focused dev days for a senior frontend engineer with Tailwind proficiency.
