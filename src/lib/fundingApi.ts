// Funding rate API fetching layer — normalizes exchange responses
// Uses native fetch only, no external dependencies

import { EXCHANGE_CONFIGS, BTC_PRICE_API, CACHE_TTL_MS } from './config/funding'
import type { FundingRateEntry } from './types'

interface CacheEntry {
  data: FundingRateEntry[]
  timestamp: number
}

const cache = new Map<string, CacheEntry>()

function getCached(exchange: string, symbol: string): FundingRateEntry[] | null {
  const key = `${exchange}:${symbol}`
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) return null
  return entry.data
}

function setCached(exchange: string, symbol: string, data: FundingRateEntry[]): void {
  cache.set(`${exchange}:${symbol}`, { data, timestamp: Date.now() })
}

export async function fetchBtcPrice(): Promise<number> {
  try {
    const res = await fetch(BTC_PRICE_API, { signal: AbortSignal.timeout(5000) })
    const data = await res.json() as { price: string }
    return parseFloat(data.price)
  } catch {
    return 0
  }
}

async function fetchBinanceFunding(symbol: string): Promise<FundingRateEntry> {
  const config = EXCHANGE_CONFIGS.binance
  const url = `${config.fundingApiUrl}?symbol=${config.fundingApiSymbol(symbol)}&limit=1`
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
  const data = await res.json() as Array<{
    symbol: string; fundingRate: string; fundingTime: number
  }>
  const item = data[0]
  const rate = parseFloat(item.fundingRate)
  return {
    exchange: 'binance',
    funding_rate: rate,
    next_funding: new Date(item.fundingTime).toISOString(),
    predicted: rate, // approximation: last rate ≈ predicted
    annualized_apr: rate * 3 * 365 * 100,
  }
}

async function fetchBybitFunding(symbol: string): Promise<FundingRateEntry> {
  const config = EXCHANGE_CONFIGS.bybit
  const url = `${config.fundingApiUrl}?category=linear&symbol=${config.fundingApiSymbol(symbol)}&limit=1`
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
  const raw = await res.json() as {
    retCode: number; result: { list: Array<{ symbol: string; fundingRate: string; fundingTime: string }> }
  }
  const item = raw.result.list[0]
  const rate = parseFloat(item.fundingRate)
  return {
    exchange: 'bybit',
    funding_rate: rate,
    next_funding: item.fundingTime,
    predicted: rate,
    annualized_apr: rate * 3 * 365 * 100,
  }
}

async function fetchOkxFunding(symbol: string): Promise<FundingRateEntry> {
  const config = EXCHANGE_CONFIGS.okx
  const url = `${config.fundingApiUrl}?instId=${config.fundingApiSymbol(symbol)}`
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
  const raw = await res.json() as {
    code: string; data: Array<{ instId: string; fundingRate: string; nextFundingTime: string }>
  }
  const item = raw.data[0]
  const rate = parseFloat(item.fundingRate)
  return {
    exchange: 'okx',
    funding_rate: rate,
    next_funding: item.nextFundingTime,
    predicted: rate,
    annualized_apr: rate * 3 * 365 * 100,
  }
}

type FetchFn = (symbol: string) => Promise<FundingRateEntry>

const EXCHANGE_FETCHERS: Record<string, FetchFn> = {
  binance: fetchBinanceFunding,
  bybit: fetchBybitFunding,
  okx: fetchOkxFunding,
}

export async function fetchFundingRate(
  exchange: string,
  symbol: string,
): Promise<FundingRateEntry> {
  const cached = getCached(exchange, symbol)
  if (cached && cached.length > 0) return cached[0]

  const fetcher = EXCHANGE_FETCHERS[exchange]
  if (!fetcher) {
    return { exchange, funding_rate: 0, next_funding: '', predicted: null, annualized_apr: 0, stale: true }
  }

  try {
    const entry = await fetcher(symbol)
    setCached(exchange, symbol, [entry])
    return entry
  } catch {
    // Return stale cached data if available, otherwise return empty with stale flag
    const stale = getCached(exchange, symbol)
    if (stale && stale.length > 0) return { ...stale[0], stale: true }
    return { exchange, funding_rate: 0, next_funding: '', predicted: null, annualized_apr: 0, stale: true }
  }
}

export async function fetchAllFundingRates(
  symbol: string,
  exchanges?: string[],
): Promise<FundingRateEntry[]> {
  const targets = exchanges ?? Object.keys(EXCHANGE_FETCHERS)
  const results = await Promise.all(targets.map(e => fetchFundingRate(e, symbol)))
  return results.filter(r => !r.stale || r.funding_rate !== 0)
}
