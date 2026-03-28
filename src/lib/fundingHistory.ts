// Funding rate history storage — JSON flat-file for percentile calculations
// Stores historical rates in /data/funding_history.json
// Separate from conversation DB since it's time-series data

import fs from 'fs'
import path from 'path'
import type { FundingRateHistoryRecord } from './types'

const DATA_DIR = path.join(process.cwd(), 'data')
const HISTORY_FILE = 'funding_history.json'

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function readHistory(): FundingRateHistoryRecord[] {
  ensureDataDir()
  const filePath = path.join(DATA_DIR, HISTORY_FILE)
  if (!fs.existsSync(filePath)) return []
  const raw = fs.readFileSync(filePath, 'utf-8')
  const parsed = JSON.parse(raw) as unknown
  if (!Array.isArray(parsed)) return []
  return parsed as FundingRateHistoryRecord[]
}

function writeHistory(records: FundingRateHistoryRecord[]): void {
  ensureDataDir()
  fs.writeFileSync(
    path.join(DATA_DIR, HISTORY_FILE),
    JSON.stringify(records, null, 2),
  )
}

export function saveFundingRates(
  records: FundingRateHistoryRecord[],
): void {
  const existing = readHistory()
  // Deduplicate: skip if same exchange+symbol+timestamp exists
  const existingKeys = new Set(
    existing.map(r => `${r.exchange}:${r.symbol}:${r.timestamp}`),
  )
  const newRecords = records.filter(
    r => !existingKeys.has(`${r.exchange}:${r.symbol}:${r.timestamp}`),
  )
  if (newRecords.length === 0) return

  const updated = [...existing, ...newRecords]
  // Keep max 90 days of data per exchange/symbol (3 periods/day * 90 days = 810)
  const maxPerKey = 810
  const grouped = new Map<string, FundingRateHistoryRecord[]>()
  for (const r of updated) {
    const key = `${r.exchange}:${r.symbol}`
    const arr = grouped.get(key) ?? []
    arr.push(r)
    grouped.set(key, arr)
  }
  const trimmed: FundingRateHistoryRecord[] = []
  for (const arr of grouped.values()) {
    arr.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    trimmed.push(...arr.slice(-maxPerKey))
  }
  writeHistory(trimmed)
}

export function getHistoryForSymbol(
  exchange: string,
  symbol: string,
  days?: number,
): FundingRateHistoryRecord[] {
  const all = readHistory()
  const filtered = all.filter(r => r.exchange === exchange && r.symbol === symbol)
  if (!days) return filtered
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return filtered.filter(r => new Date(r.timestamp) >= cutoff)
}

export function calculatePercentile(
  exchange: string,
  symbol: string,
  currentRate: number,
  days: number,
): number | null {
  const history = getHistoryForSymbol(exchange, symbol, days)
  if (history.length < 10) return null  // need minimum data
  const rates = history.map(r => r.rate).sort((a, b) => a - b)
  const belowCount = rates.filter(r => r < currentRate).length
  return Math.round((belowCount / rates.length) * 100)
}

export function calculateConsecutiveNegative(
  exchange: string,
  symbol: string,
): number {
  const history = getHistoryForSymbol(exchange, symbol)
  if (history.length === 0) return 0
  // Sort newest first, count consecutive negative from most recent
  const sorted = [...history].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )
  let count = 0
  for (const r of sorted) {
    if (r.rate < 0) count++
    else break
  }
  return count
}
