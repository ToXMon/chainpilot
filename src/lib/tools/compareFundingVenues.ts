import { z } from 'zod'
import { fetchAllFundingRates } from '../fundingApi'
import { EXCHANGE_CONFIGS, FUNDING_PERIODS_PER_DAY, FUNDING_PERIODS_PER_YEAR } from '../config/funding'
import type { CompareVenuesResult, RankedVenue } from '../types'

export const compareFundingVenuesSchema = z.object({
  symbol: z.string().default('BTC').describe('Trading pair symbol'),
  capital_usd: z.number().describe('Capital amount in USD for fee-adjusted comparison'),
  side: z.enum(['short', 'long']).default('short').describe('Which side of the trade'),
})

function determineTradeDirection(rate: number): 'long_spot_short_perp' | 'long_perp_short_spot' {
  // Positive rate: longs pay shorts → standard basis = long spot + short perp
  // Negative rate: shorts pay longs → reverse basis = long perp + short spot
  return rate >= 0 ? 'long_spot_short_perp' : 'long_perp_short_spot'
}

function buildVenue(
  exchange: string,
  rate: number,
  capitalUsd: number,
): RankedVenue {
  const config = EXCHANGE_CONFIGS[exchange]
  if (!config) {
    return {
      exchange, funding_rate: rate, fee_per_period: 0,
      trade_direction: 'long_spot_short_perp', net_daily_yield_usd: 0,
      net_annualized_apr: 0, execution_complexity: 'high',
    }
  }

  const tradeDir = determineTradeDirection(rate)
  // Maker fee per funding period (one trade to open/close position)
  const feePerPeriod = capitalUsd * config.makerFee
  // Spot entry/exit fees (one-time, amortized per period over hold)
  const spotFeesOneTime = capitalUsd * config.spotFee * 2 // entry + exit

  // Funding collected per period = |rate| * capital (absolute value)
  const fundingPerPeriod = Math.abs(rate) * capitalUsd
  // Net daily yield = (funding collected * 3 periods) - (maker fee * 3) - (spot fees amortized)
  // For simplicity: net per period = funding - fee, daily = * 3
  const netPerPeriod = fundingPerPeriod - feePerPeriod
  const netDaily = netPerPeriod * FUNDING_PERIODS_PER_DAY
  const netAnnual = netPerPeriod * FUNDING_PERIODS_PER_YEAR - spotFeesOneTime
  const annualizedApr = (netAnnual / capitalUsd) * 100

  return {
    exchange,
    funding_rate: rate,
    fee_per_period: Math.round(feePerPeriod * 100) / 100,
    trade_direction: tradeDir,
    net_daily_yield_usd: Math.round(netDaily * 100) / 100,
    net_annualized_apr: Math.round(annualizedApr * 100) / 100,
    execution_complexity: config.executionComplexity,
  }
}

function buildRecommendation(venues: RankedVenue[], capitalUsd: number): CompareVenuesResult['recommendation'] {
  const best = venues[0]
  if (!best) {
    return { best_venue: 'none', reason: 'No venue data available', trade_structure: '', warnings: [] }
  }

  const isReverse = best.trade_direction === 'long_perp_short_spot'
  const config = EXCHANGE_CONFIGS[best.exchange]
  const multiAssetNote = config?.supportsMultiAsset
    ? ` Use ${config.name}'s Multi-Assets Mode so spot collateral offsets perp margin.`
    : ''

  const structure = isReverse
    ? `Long $${capitalUsd} ${best.funding_rate < 0 ? '' : ''}BTC perp on ${config?.name ?? best.exchange} + Short $${capitalUsd} BTC spot (sell) on ${config?.name ?? best.exchange}.${multiAssetNote} Net: collect $${best.net_daily_yield_usd}/day funding.`
    : `Long $${capitalUsd} BTC spot on ${config?.name ?? best.exchange} + Short $${capitalUsd} BTC perp on ${config?.name ?? best.exchange}.${multiAssetNote} Net: collect $${best.net_daily_yield_usd}/day funding.`

  const warnings: string[] = []
  if (best.funding_rate < 0) {
    warnings.push('Rate is negative (shorts pay longs) — you must be LONG perp, not short perp')
    warnings.push('Rate could flip positive within 2-6 weeks based on historical negative regimes')
  } else {
    warnings.push('Rate is positive — standard basis trade. Watch for rate compression.')
  }

  return {
    best_venue: best.exchange,
    reason: `Highest net yield after fees at $${best.net_daily_yield_usd}/day (${best.net_annualized_apr}% annualized).`,
    trade_structure: structure,
    warnings,
  }
}

export async function compareFundingVenues({
  toolArgs,
}: {
  userMessage: string
  toolArgs: z.infer<typeof compareFundingVenuesSchema>
}): Promise<string> {
  try {
    const { symbol, capital_usd, side } = compareFundingVenuesSchema.parse(toolArgs)
    const symbolUpper = symbol.toUpperCase()
    const rates = await fetchAllFundingRates(symbolUpper)

    const venues = rates.map(r => buildVenue(r.exchange, r.funding_rate, capital_usd))
    // Sort by net daily yield descending
    venues.sort((a, b) => b.net_daily_yield_usd - a.net_daily_yield_usd)

    const result: CompareVenuesResult = {
      symbol: symbolUpper,
      side,
      capital_usd,
      ranked_venues: venues,
      recommendation: buildRecommendation(venues, capital_usd),
    }

    return JSON.stringify(result)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return JSON.stringify({ error: `Failed to compare venues: ${msg}` })
  }
}
