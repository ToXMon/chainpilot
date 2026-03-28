import { getBalanceSchema } from './getBalance'
import { getTokenBalanceSchema } from './getTokenBalance'
import { getGasPriceSchema } from './getGasPrice'
import { getBlockInfoSchema } from './getBlockInfo'
import { getTokenInfoSchema } from './getTokenInfo'
import { getChainIdSchema } from './getChainId'
import { resolveEnsSchema } from './resolveEns'
import { getFundingRatesSchema } from './getFundingRates'
import { compareFundingVenuesSchema } from './compareFundingVenues'
import { calculateStrategyPnlSchema } from './calculateStrategyPnl'

// ⚠️ RAW tool definitions — zodFunction() in agent.ts wraps these into OpenAI format
// Do NOT wrap in {type:'function', function:{...}} — that's what zodFunction does!
// Wrapping them here causes DOUBLE-WRAPPING and breaks ALL tool calling.
export const tools = [
  {
    name: 'get_balance',
    parameters: getBalanceSchema,
    description: 'Get the native token balance of a wallet address on a specified chain. Returns balance in both wei and human-readable format. Use this before any transaction estimate.',
  },
  {
    name: 'get_token_balance',
    parameters: getTokenBalanceSchema,
    description: 'Get the ERC-20 token balance of a wallet address. Returns token name, symbol, decimals, and formatted balance. WARNING: USDC and USDT have 6 decimals (not 18) — always report the actual decimals from the contract, never assume 18.',
  },
  {
    name: 'get_gas_price',
    parameters: getGasPriceSchema,
    description: 'Get the current gas price for a chain. Returns gas price in wei and gwei, plus estimated transaction cost. Note: post-Fusaka, Ethereum base fees are typically 0.1-0.5 gwei (not 10-30 as old training data suggests). USD estimates use approximate token prices.',
  },
  {
    name: 'get_block_info',
    parameters: getBlockInfoSchema,
    description: 'Get detailed information about a specific block or the latest block on a chain. Returns timestamp, transaction count, gas usage percentage, and validator/miner address.',
  },
  {
    name: 'get_token_info',
    parameters: getTokenInfoSchema,
    description: 'Get metadata for an ERC-20 token contract. Returns name, symbol, decimals, and total supply. Always verify the contract address onchain — never fabricate token data.',
  },
  {
    name: 'get_chain_id',
    parameters: getChainIdSchema,
    description: 'Get the chain ID and latest block info for a specified chain. Useful for verifying network connectivity and confirming you are on the correct chain.',
  },
  {
    name: 'resolve_ens',
    parameters: resolveEnsSchema,
    description: 'Resolve an ENS name (e.g., vitalik.eth) to its Ethereum address. Only works on Ethereum mainnet. ENS supports .eth domains natively and other domains via DNS integration.',
  },
  {
    name: 'get_funding_rates',
    parameters: getFundingRatesSchema,
    description: 'Get current funding rates for a perpetual futures symbol across exchanges (Binance, Bybit, OKX). Returns per-exchange rates, predicted next rate, annualized APR, and market context including percentile rankings. Use this when a user asks about funding rates, yield opportunities, or whether a rate is historically unusual. Example queries: "What\'s the BTC funding rate?", "Is the ETH funding rate rare right now?"',
  },
  {
    name: 'compare_funding_venues',
    parameters: compareFundingVenuesSchema,
    description: 'Compare funding rate venues for a delta-neutral basis trade. Takes capital amount and trade side, returns venues ranked by net yield after fees with the correct trade structure (standard basis or reverse basis depending on rate sign). Includes fee breakdown, trade direction recommendation, and warnings. Use when a user asks: "Which exchange has the best rate?", "What\'s the play with $1000?", "Where should I open a basis trade?"',
  },
  {
    name: 'calculate_strategy_pnl',
    parameters: calculateStrategyPnlSchema,
    description: 'Calculate PnL for a delta-neutral funding rate strategy (basis trade). Takes entry/current funding rates, capital, periods held, entry/current BTC price, trade structure, and exchange. Returns funding PnL, fee breakdown, net PnL, annualized return, Sharpe estimate, and hold recommendation. Use when a user asks: "How\'s my position doing?", "What\'s my PnL after 3 days?", "Should I close my basis trade?"',
  },
]

export const toolDefinitions: Record<string, (input: { userMessage: string; toolArgs: any }) => Promise<string>> = {
  get_balance: (await import('./getBalance')).getBalance,
  get_token_balance: (await import('./getTokenBalance')).getTokenBalance,
  get_gas_price: (await import('./getGasPrice')).getGasPrice,
  get_block_info: (await import('./getBlockInfo')).getBlockInfo,
  get_token_info: (await import('./getTokenInfo')).getTokenInfo,
  get_chain_id: (await import('./getChainId')).getChainId,
  get_funding_rates: (await import('./getFundingRates')).getFundingRates,
  compare_funding_venues: (await import('./compareFundingVenues')).compareFundingVenues,
  calculate_strategy_pnl: (await import('./calculateStrategyPnl')).calculateStrategyPnl,
  resolve_ens: (await import('./resolveEns')).resolveEns,
}
