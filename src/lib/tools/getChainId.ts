import { z } from 'zod'
import { ethers } from 'ethers'

export const getChainIdSchema = z.object({
  chain: z.enum(['ethereum', 'bsc', 'polygon', 'arbitrum', 'base']).optional().default('ethereum'),
})

const CHAIN_NAMES: Record<string, string> = {
  ethereum: 'Ethereum Mainnet',
  bsc: 'BNB Smart Chain',
  polygon: 'Polygon',
  arbitrum: 'Arbitrum One',
  base: 'Base',
}

export async function getChainId({ toolArgs }: { userMessage: string; toolArgs: z.infer<typeof getChainIdSchema> }) {
  try {
    const { chain } = getChainIdSchema.parse(toolArgs)

    const rpcUrls: Record<string, string> = {
      ethereum: process.env.ETH_RPC_URL || 'https://eth.llamarpc.com',
      bsc: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
      polygon: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
      arbitrum: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
      base: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    }

    const provider = new ethers.JsonRpcProvider(rpcUrls[chain])
    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber(),
    ])

    const latestBlock = await provider.getBlock(blockNumber)
    const latestBlockTimestamp = latestBlock
      ? new Date(latestBlock.timestamp * 1000).toISOString()
      : null

    return JSON.stringify({
      chain,
      chain_name: CHAIN_NAMES[chain],
      chain_id: Number(network.chainId),
      block_number: blockNumber,
      latest_block_timestamp: latestBlockTimestamp,
      rpc_url: rpcUrls[chain],
    })
  } catch (error: any) {
    return JSON.stringify({ error: `Failed to get chain info: ${error.message}` })
  }
}
