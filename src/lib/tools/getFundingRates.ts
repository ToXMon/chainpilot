import { z } from 'zod'
import { fetchAllFundingRates, fetchBtcPrice } from '../fundingApi'
import { saveFundingRates, calculatePercentile, calculateConsecutiveNegative } from '../fundingHistory'
import type { FundingRateResult, FundingRateHistoryRecord } from '../types'

export const getFundingRatesSchema = z.object({
  symbol: z.string().default('BTC').describe('Trading pair symbol (BTC, ETH, SOL)'),
  exchanges: z.array(z.string()).optional().describe('Specific exchanges to query. Omit for all.'),
})

export async function getFundingRates({
  toolArgs,
}: {
  userMessage: string
  toolArgs: z.infer<typeof getFundingRatesSchema>
}): Promise<string> {
  try {
    const { symbol, exchanges } = getFundingRatesSchema.parse(toolArgs)
    const symbolUpper = symbol.toUpperCase()

    const [rates, btcPrice] = await Promise.all([
      fetchAllFundingRates(symbolUpper, exchanges),
      fetchBtcPrice(),
    ])

    // Save to history for percentile calculations
    const now = new Date().toISOString()
    const historyRecords: FundingRateHistoryRecord[] = rates.map(r => ({
      exchange: r.exchange,
      symbol: symbolUpper,
      rate: r.funding_rate,
      timestamp: now,
    }))
    saveFundingRates(historyRecords)

    // Calculate market context using first exchange as reference
    const refExchange = rates[0]?.exchange ?? 'binance'
    const refRate = rates[0]?.funding_rate ?? 0

    const percentile90d = calculatePercentile(refExchange, symbolUpper, refRate, 90)
    const percentile1y = calculatePercentile(refExchange, symbolUpper, refRate, 365)
    const consecutiveNeg = calculateConsecutiveNegative(refExchange, symbolUpper)

    const result: FundingRateResult = {
      timestamp: now,
      symbol: symbolUpper,
      rates,
      market_context: {
        btc_price: btcPrice,
        rate_percentile_90d: percentile90d,
        rate_percentile_1y: percentile1y,
        consecutive_negative_periods: consecutiveNeg,
      },
    }

    // Add note if percentiles are null (insufficient history)
    if (percentile90d === null) {
      return JSON.stringify({
        ...result,
        note: 'Percentile data unavailable — historical funding rates are being collected. Percentiles will appear after ~10 data points per exchange (approximately 3-4 days).',
      })
    }

    return JSON.stringify(result)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return JSON.stringify({ error: `Failed to get funding rates: ${msg}` })
  }
}
