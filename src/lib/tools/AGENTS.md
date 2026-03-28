# Blockchain Tools Module

## Module Purpose
Blockchain interaction tools — each tool fetches on-chain data from EVM chains or market data from exchange APIs. Tools are read-only (no transactions). Blockchain tools use ethers.js v6 with configurable RPC endpoints. Funding rate tools use native fetch with exchange public APIs.

## Standards
- Each tool file exports a Zod schema and an executor function
- Consistent signature: async function toolName({ userMessage, toolArgs }) => string
- Returns JSON.stringify(result) — always a string
- Handles errors gracefully: try/catch returning { error: message } as JSON string
- Chain selection via z.enum(['ethereum','bsc','polygon','arbitrum','base']) with env var fallbacks

## Tools List

| File | Tool Name | Description |
|------|-----------|-------------|
| getBalance.ts | get_balance | Get native token balance for a wallet address |
| getTokenBalance.ts | get_token_balance | Get ERC-20 token balance with name/symbol/decimals |
| getGasPrice.ts | get_gas_price | Get current gas price in Gwei with approximate USD cost |
| getBlockInfo.ts | get_block_info | Get latest block number and timestamp |
| getTokenInfo.ts | get_token_info | Get ERC-20 token metadata (name, symbol, decimals, supply) |
| getChainId.ts | get_chain_id | Get current chain ID for a given network |
| resolveEns.ts | resolve_ens | Resolve ENS name to Ethereum address |
| getFundingRates.ts | get_funding_rates | Get funding rates across exchanges with percentile context |
| compareFundingVenues.ts | compare_funding_venues | Compare venues for delta-neutral basis trade with fee-adjusted yield |
| calculateStrategyPnl.ts | calculate_strategy_pnl | Calculate PnL, Sharpe, and hold recommendation for basis trade |

## Funding Rate Tools

Three tools for funding rate strategy analysis (Phase 1 — monitoring only, no execution):

- **getFundingRates**: Fetches live rates from Binance/Bybit/OKX APIs, stores history for percentile calc
- **compareFundingVenues**: Ranks exchanges by net yield after fees, determines correct trade structure
- **calculateStrategyPnl**: Evaluates existing/hypothetical position PnL with Sharpe estimation

Dependencies: `../fundingApi.ts` (API layer), `../fundingHistory.ts` (JSON storage), `../config/funding.ts` (exchange config)

Domain logic: positive rate = longs pay shorts (standard basis), negative rate = shorts pay longs (reverse basis).

## Type Contracts
All tools return objects with fields matching types defined in src/lib/types.ts. Tool results are serialized as JSON strings before being sent to the LLM as tool response messages.

## Registration
Tools are registered in index.ts which exports:
- tools array: raw {name, description, parameters} objects (no type/function wrapper — zodFunction adds it)
- toolDefinitions map: name -> executor function (dynamic imports)

IMPORTANT: The export name toolDefinitions is referenced by toolRunner.ts — do not rename.
