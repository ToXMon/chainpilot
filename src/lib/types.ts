import OpenAI from 'openai'

export type AIMessage =
  | OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam
  | { role: 'user'; content: string }
  | { role: 'tool'; content: string; tool_call_id: string }

export interface ToolFn<A = unknown, T = string> {
  (input: { userMessage: string; toolArgs: A }): Promise<T>
}

export interface ChatMessage {
  id: string
  role: string
  content: string | null
  toolName?: string | null
  toolArgs?: string | null
  createdAt: string
}

// --- Funding Rate Strategy Types ---

export interface FundingRateEntry {
  exchange: string
  funding_rate: number
  next_funding: string
  predicted: number | null
  annualized_apr: number
  stale?: boolean
}

export interface MarketContext {
  btc_price: number
  rate_percentile_90d: number | null
  rate_percentile_1y: number | null
  consecutive_negative_periods: number
}

export interface FundingRateResult {
  timestamp: string
  symbol: string
  rates: FundingRateEntry[]
  market_context: MarketContext
}

export interface RankedVenue {
  exchange: string
  funding_rate: number
  fee_per_period: number
  trade_direction: 'long_spot_short_perp' | 'long_perp_short_spot'
  net_daily_yield_usd: number
  net_annualized_apr: number
  execution_complexity: 'low' | 'medium' | 'high'
}

export interface VenueRecommendation {
  best_venue: string
  reason: string
  trade_structure: string
  warnings: string[]
}

export interface CompareVenuesResult {
  symbol: string
  side: string
  capital_usd: number
  ranked_venues: RankedVenue[]
  recommendation: VenueRecommendation
}

export interface StrategyPnlResult {
  trade_structure: string
  capital_usd: number
  periods_held: number
  funding_pnl_usd: number
  price_pnl_usd: number
  entry_fees_usd: number
  exit_fees_usd: number
  total_fees_usd: number
  net_pnl_usd: number
  net_pnl_pct: number
  annualized_return: number
  sharpe_estimate: number
  status: 'profitable' | 'unprofitable' | 'breakeven'
  recommendation: string
}

export interface FundingRateHistoryRecord {
  exchange: string
  symbol: string
  rate: number
  timestamp: string
}
