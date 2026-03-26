import { z } from 'zod'
import { ethers } from 'ethers'

export const getGasPriceSchema = z.object({
  chain: z.enum(['ethereum', 'bsc', 'polygon', 'arbitrum', 'base']).optional().default('ethereum'),
})

// Approximate prices — volatile, for rough USD estimation only
// Post-Fusaka (Dec 2025), gas is typically 0.1-0.5 gwei on Ethereum
const NATIVE_TOKEN_PRICES: Record<string, number> = {
  ethereum: 2000,
  bsc: 600,
  polygon: 0.45,  // POL token
  arbitrum: 2000, // ETH on Arbitrum
  base: 2000,     // ETH on Base
}

const NATIVE_TOKEN_SYMBOLS: Record<string, string> = {
  ethereum: 'ETH',
  bsc: 'BNB',
  polygon: 'POL',
  arbitrum: 'ETH',
  base: 'ETH',
}

export async function getGasPrice({ toolArgs }: { userMessage: string; toolArgs: z.infer<typeof getGasPriceSchema> }) {
  try {
    const { chain } = getGasPriceSchema.parse(toolArgs)

    const rpcUrls: Record<string, string> = {
      ethereum: process.env.ETH_RPC_URL || 'https://eth.llamarpc.com',
      bsc: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
      polygon: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
      arbitrum: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
      base: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    }

    const provider = new ethers.JsonRpcProvider(rpcUrls[chain])
    const gasPrice = await provider.getFeeData()

    const gasPriceWei = gasPrice.gasPrice?.toString() || '0'
    const gasPriceGwei = gasPrice.gasPrice ? ethers.formatUnits(gasPrice.gasPrice, 'gwei') : '0'
    const tokenPrice = NATIVE_TOKEN_PRICES[chain]
    const tokenSymbol = NATIVE_TOKEN_SYMBOLS[chain]

    // Estimate cost for a standard ETH transfer (21,000 gas)
    const estimatedGasLimit = 21000
    const estimatedCostNative = gasPrice.gasPrice
      ? ethers.formatEther(gasPrice.gasPrice * BigInt(estimatedGasLimit))
      : '0'
    const estimatedCostUsd = gasPrice.gasPrice
      ? (Number(ethers.formatEther(gasPrice.gasPrice * BigInt(estimatedGasLimit))) * tokenPrice).toFixed(2)
      : '0'

    return JSON.stringify({
      chain,
      gas_price_wei: gasPriceWei,
      gas_price_gwei: gasPriceGwei,
      native_token: tokenSymbol,
      estimated_cost_native: estimatedCostNative,
      estimated_cost_usd: estimatedCostUsd,
      estimated_gas_limit: estimatedGasLimit,
      disclaimer: `USD estimate uses approximate ${tokenSymbol} price of $${tokenPrice} — actual price is volatile. Gas price is real-time from the chain.`,
    })
  } catch (error: any) {
    return JSON.stringify({ error: `Failed to get gas price: ${error.message}` })
  }
}
