# Blockchain Tools Module

## Module Purpose
Blockchain interaction tools — each tool fetches on-chain data from EVM chains. Tools are read-only (no transactions). All tools use ethers.js v6 with configurable RPC endpoints.

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

## Type Contracts
All tools return objects with fields matching types defined in src/lib/types.ts. Tool results are serialized as JSON strings before being sent to the LLM as tool response messages.

## Registration
Tools are registered in index.ts which exports:
- tools array: raw {name, description, parameters} objects (no type/function wrapper — zodFunction adds it)
- toolDefinitions map: name -> executor function (dynamic imports)

IMPORTANT: The export name toolDefinitions is referenced by toolRunner.ts — do not rename.
