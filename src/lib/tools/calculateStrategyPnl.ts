import { z } from 'zod'
import { EXCHANGE_CONFIGS, FUNDING_PERIODS_PER_DAY, RESIDUAL_VOLATILITY } from '../config/funding'
import type { StrategyPnlResult } from '../types'

export const calculateStrategyPnlSchema = z.object({
  entry_funding_rate: z.number().describe('Funding rate at entry'),
  current_funding_rate: z.number().describe('Current funding rate'),
  capital_usd: z.number().describe('Capital in USD'),
  periods_held: z.number().describe('Number of 8h funding periods held'),
  entry_btc_price: z.number().describe('BTC price at entry'),
  current_btc_price: z.number().describe('Current BTC price'),
  trade_structure: z.enum(['long_spot_short_perp', 'long_perp_short_spot']).describe(
    'Trade structure: long_spot_short_perp (standard basis) or long_perp_short_spot (reverse basis)',
  ),
  exchange: z.string().default('binance').describe('Exchange name'),
})

export async function calculateStrategyPnl({
  toolArgs,
}: {
  userMessage: string
  toolArgs: z.infer<typeof calculateStrategyPnlSchema>
}): Promise<string> {
  try {
    const {
      entry_funding_rate, current_funding_rate, capital_usd, periods_held,
      trade_structure, exchange,
    } = calculateStrategyPnlSchema.parse(toolArgs)

    const config = EXCHANGE_CONFIGS[exchange]
    const makerFee = config?.makerFee ?? 0.0002
    const spotFee = config?.spotFee ?? 0.001

    // Average funding rate over hold period (simple average of entry and current)
    const avgRate = (entry_funding_rate + current_funding_rate) / 2
    // Funding collected = |avg_rate| * capital * periods (absolute value)
    const fundingPnl = Math.abs(avgRate) * capital_usd * periods_held

    // Price PnL: delta-neutral ≈ 0, spot gain offsets perp loss exactly
    const pricePnl = 0

    // Entry fees: spot trade (open) + perp trade (open)
    const entryFees = (capital_usd * spotFee) + (capital_usd * makerFee)
    // Exit fees: same structure (estimated, not yet closed)
    const exitFees = entryFees
    const totalFees = entryFees + exitFees

    const netPnl = fundingPnl + pricePnl - totalFees
    const netPnlPct = (netPnl / capital_usd) * 100

    // Annualized return based on periods held
    const daysHeld = periods_held / FUNDING_PERIODS_PER_DAY
    const annualizedReturn = daysHeld > 0
      ? ((netPnl / capital_usd) / daysHeld) * 365 * 100
      : 0

    // Sharpe estimate: annualized_return / residual_volatility
    // Delta-neutral → directional vol ≈ 0, residual vol from execution risk
    const sharpe = RESIDUAL_VOLATILITY > 0
      ? Math.abs(annualizedReturn / 100) / RESIDUAL_VOLATILITY
      : 0

    // Status determination
    const status: StrategyPnlResult['status'] =
      netPnl > 0.01 ? 'profitable'
        : netPnl < -0.01 ? 'unprofitable'
          : 'breakeven'

    // Recommendation
    const isNegative = current_funding_rate < 0
    const rateDirection = isNegative ? 'negative' : 'positive'
    const holdAdvice = netPnl > 0
      ? 'Continue holding.'
      : netPnl > -totalFees
        ? 'Approaching breakeven. Consider holding if rate persists.'
        : 'Net negative. Evaluate whether rate regime is shifting.'
    const rateAdvice = isNegative
      ? ` Rate still ${rateDirection} — if below 10th percentile, mean reversion likely within 2-4 weeks.`
      : ` Rate is ${rateDirection} — standard basis regime.`

    const result: StrategyPnlResult = {
      trade_structure: trade_structure,
      capital_usd: Math.round(capital_usd * 100) / 100,
      periods_held,
      funding_pnl_usd: Math.round(fundingPnl * 100) / 100,
      price_pnl_usd: Math.round(pricePnl * 100) / 100,
      entry_fees_usd: Math.round(entryFees * 100) / 100,
      exit_fees_usd: Math.round(exitFees * 100) / 100,
      total_fees_usd: Math.round(totalFees * 100) / 100,
      net_pnl_usd: Math.round(netPnl * 100) / 100,
      net_pnl_pct: Math.round(netPnlPct * 100) / 100,
      annualized_return: Math.round(annualizedReturn * 100) / 100,
      sharpe_estimate: Math.round(sharpe * 100) / 100,
      status,
      recommendation: `${holdAdvice}${rateAdvice}`,
    }

    return JSON.stringify(result)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return JSON.stringify({ error: `Failed to calculate strategy PnL: ${msg}` })
  }
}
