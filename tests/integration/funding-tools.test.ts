// Integration test for funding rate strategy tools
// Run with: npx tsx tests/integration/funding-tools.test.ts
// Output: /data/funding_test_results.json

import fs from 'fs'
import path from 'path'
import { getFundingRates } from '../../src/lib/tools/getFundingRates'
import { compareFundingVenues } from '../../src/lib/tools/compareFundingVenues'
import { calculateStrategyPnl } from '../../src/lib/tools/calculateStrategyPnl'

const DATA_DIR = path.join(process.cwd(), 'data')

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function writeResult(filename: string, data: unknown): void {
  ensureDataDir()
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2))
}

interface TestResult {
  tool: string
  passed: boolean
  error?: string
  output?: unknown
}

const results: TestResult[] = []

async function testGetFundingRates(): Promise<void> {
  try {
    const raw = await getFundingRates({
      userMessage: 'What is the BTC funding rate?',
      toolArgs: { symbol: 'BTC' },
    })
    const parsed = JSON.parse(raw) as Record<string, unknown>

    // Validate shape
    const hasTimestamp = typeof parsed.timestamp === 'string'
    const hasSymbol = parsed.symbol === 'BTC'
    const hasRates = Array.isArray(parsed.rates) && parsed.rates.length > 0
    const hasContext = typeof parsed.market_context === 'object' && parsed.market_context !== null

    const passed = hasTimestamp && hasSymbol && hasRates && hasContext
    results.push({ tool: 'get_funding_rates', passed, output: parsed })
    writeResult('get_funding_rates_result.json', parsed)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    results.push({ tool: 'get_funding_rates', passed: false, error: msg })
  }
}

async function testCompareFundingVenues(): Promise<void> {
  try {
    const raw = await compareFundingVenues({
      userMessage: 'I have $1000, what is the play?',
      toolArgs: { symbol: 'BTC', capital_usd: 1000, side: 'short' },
    })
    const parsed = JSON.parse(raw) as Record<string, unknown>

    const hasSymbol = parsed.symbol === 'BTC'
    const hasCapital = parsed.capital_usd === 1000
    const hasVenues = Array.isArray(parsed.ranked_venues) && parsed.ranked_venues.length > 0
    const hasRec = typeof parsed.recommendation === 'object' && parsed.recommendation !== null

    const passed = hasSymbol && hasCapital && hasVenues && hasRec
    results.push({ tool: 'compare_funding_venues', passed, output: parsed })
    writeResult('compare_funding_venues_result.json', parsed)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    results.push({ tool: 'compare_funding_venues', passed: false, error: msg })
  }
}

async function testCalculateStrategyPnl(): Promise<void> {
  try {
    const raw = await calculateStrategyPnl({
      userMessage: 'How is my position doing?',
      toolArgs: {
        entry_funding_rate: -0.0002,
        current_funding_rate: -0.00018,
        capital_usd: 1000,
        periods_held: 12,
        entry_btc_price: 68000,
        current_btc_price: 68500,
        trade_structure: 'long_perp_short_spot',
        exchange: 'binance',
      },
    })
    const parsed = JSON.parse(raw) as Record<string, unknown>

    const hasStructure = typeof parsed.trade_structure === 'string'
    const hasCapital = parsed.capital_usd === 1000
    const hasPeriods = parsed.periods_held === 12
    const hasFundingPnl = typeof parsed.funding_pnl_usd === 'number'
    const hasNetPnl = typeof parsed.net_pnl_usd === 'number'
    const hasSharpe = typeof parsed.sharpe_estimate === 'number'
    const hasStatus = typeof parsed.status === 'string'
    const hasRecommendation = typeof parsed.recommendation === 'string'

    const passed = hasStructure && hasCapital && hasPeriods && hasFundingPnl && hasNetPnl && hasSharpe && hasStatus && hasRecommendation
    results.push({ tool: 'calculate_strategy_pnl', passed, output: parsed })
    writeResult('calculate_strategy_pnl_result.json', parsed)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    results.push({ tool: 'calculate_strategy_pnl', passed: false, error: msg })
  }
}

async function main(): Promise<void> {
  console.log('Running funding rate tools integration tests...')
  console.log('')

  await testGetFundingRates()
  await testCompareFundingVenues()
  await testCalculateStrategyPnl()

  console.log('Results:')
  for (const r of results) {
    const icon = r.passed ? '✅' : '❌'
    console.log(`  ${icon} ${r.tool}${r.error ? ` — ${r.error}` : ''}`)
  }

  const allPassed = results.every(r => r.passed)
  console.log('')
  console.log(allPassed ? 'All tests passed!' : 'Some tests failed.')

  // Write summary
  writeResult('funding_test_results.json', results)

  if (!allPassed) {
    // Log errors but don't crash (autonomy rule)
    const errors = results.filter(r => !r.passed).map(r => ({ tool: r.tool, error: r.error }))
    writeResult('errors.json', errors)
  }
}

main().catch(console.error)
