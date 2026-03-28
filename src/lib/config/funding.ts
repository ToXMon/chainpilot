// Funding rate tool configuration — exchange fees, API endpoints, thresholds
// NOT hardcoded in tool files — all tools import from here

export interface ExchangeConfig {
  id: string
  name: string
  makerFee: number   // e.g. 0.0002 = 0.02%
  takerFee: number   // e.g. 0.0005 = 0.05%
  spotFee: number    // one-way spot fee
  fundingApiUrl: string
  fundingApiSymbol: (symbol: string) => string
  supportsHedgeMode: boolean
  supportsMultiAsset: boolean
  executionComplexity: 'low' | 'medium' | 'high'
}

export const EXCHANGE_CONFIGS: Record<string, ExchangeConfig> = {
  binance: {
    id: 'binance',
    name: 'Binance',
    makerFee: 0.0002,
    takerFee: 0.0005,
    spotFee: 0.001,
    fundingApiUrl: 'https://fapi.binance.com/fapi/v1/fundingRate',
    fundingApiSymbol: (s: string) => `${s}USDT`,
    supportsHedgeMode: true,
    supportsMultiAsset: true,
    executionComplexity: 'low',
  },
  bybit: {
    id: 'bybit',
    name: 'Bybit',
    makerFee: 0.0002,
    takerFee: 0.00055,
    spotFee: 0.001,
    fundingApiUrl: 'https://api.bybit.com/v5/market/funding/history',
    fundingApiSymbol: (s: string) => `${s}USDT`,
    supportsHedgeMode: true,
    supportsMultiAsset: true,
    executionComplexity: 'low',
  },
  okx: {
    id: 'okx',
    name: 'OKX',
    makerFee: 0.0002,
    takerFee: 0.0005,
    spotFee: 0.001,
    fundingApiUrl: 'https://www.okx.com/api/v5/public/funding-rate',
    fundingApiSymbol: (s: string) => `${s}-USDT-SWAP`,
    supportsHedgeMode: true,
    supportsMultiAsset: true,
    executionComplexity: 'low',
  },
}

export const DEFAULT_EXCHANGES = Object.keys(EXCHANGE_CONFIGS)

export const FUNDING_PERIODS_PER_DAY = 3  // 00:00, 08:00, 16:00 UTC
export const FUNDING_PERIODS_PER_YEAR = FUNDING_PERIODS_PER_DAY * 365

export const RESIDUAL_VOLATILITY = 0.05  // 5% conservative residual vol for Sharpe

// Percentile thresholds for flagging rare events
export const PERCENTILE_THRESHOLDS = {
  rare: 10,      // below 10th percentile = rare
  extreme: 5,    // below 5th percentile = extremely rare
  unprecedented: 1, // below 1st percentile = unprecedented
} as const

// BTC price API
export const BTC_PRICE_API = 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT'

// Cache TTL for funding rate data (5 minutes)
export const CACHE_TTL_MS = 5 * 60 * 1000
