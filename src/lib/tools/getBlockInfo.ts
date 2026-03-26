import { z } from 'zod'
import { ethers } from 'ethers'

export const getBlockInfoSchema = z.object({
  blockNumber: z.number().optional().describe('Block number to query. If omitted, returns latest block.'),
  chain: z.enum(['ethereum', 'bsc', 'polygon', 'arbitrum', 'base']).optional().default('ethereum'),
})

export async function getBlockInfo({ toolArgs }: { userMessage: string; toolArgs: z.infer<typeof getBlockInfoSchema> }) {
  try {
    const { blockNumber, chain } = getBlockInfoSchema.parse(toolArgs)

    const rpcUrls: Record<string, string> = {
      ethereum: process.env.ETH_RPC_URL || 'https://eth.llamarpc.com',
      bsc: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
      polygon: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
      arbitrum: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
      base: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    }

    const provider = new ethers.JsonRpcProvider(rpcUrls[chain])
    const targetBlock = blockNumber !== undefined ? blockNumber : await provider.getBlockNumber()
    const block = await provider.getBlock(targetBlock)

    if (!block) {
      return JSON.stringify({ error: `Block ${targetBlock} not found on ${chain}` })
    }

    return JSON.stringify({
      number: block.number,
      timestamp: new Date(block.timestamp * 1000).toISOString(),
      timestamp_unix: block.timestamp,
      transactions_count: block.transactions.length,
      gas_used: block.gasUsed.toString(),
      gas_limit: block.gasLimit.toString(),
      gas_used_percentage: ((Number(block.gasUsed) / Number(block.gasLimit)) * 100).toFixed(2) + '%',
      base_fee_per_gas: block.baseFeePerGas ? block.baseFeePerGas.toString() : null,
      miner: block.miner,
      hash: block.hash,
      parent_hash: block.parentHash,
      chain,
    })
  } catch (error: any) {
    return JSON.stringify({ error: `Failed to get block info: ${error.message}` })
  }
}
