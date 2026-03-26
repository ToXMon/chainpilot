import { z } from 'zod'
import { ethers } from 'ethers'

export const getBalanceSchema = z.object({
  address: z.string().describe('Ethereum wallet address'),
  chain: z.enum(['ethereum', 'bsc', 'polygon', 'arbitrum', 'base']).optional().default('ethereum'),
})

export async function getBalance({ toolArgs }: { userMessage: string; toolArgs: z.infer<typeof getBalanceSchema> }) {
  try {
    const { address, chain } = getBalanceSchema.parse(toolArgs)

    if (!ethers.isAddress(address)) {
      return JSON.stringify({ error: 'Invalid Ethereum address format' })
    }

    const rpcUrls: Record<string, string> = {
      ethereum: process.env.ETH_RPC_URL || 'https://eth.llamarpc.com',
      bsc: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
      polygon: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
      arbitrum: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
      base: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    }

    const provider = new ethers.JsonRpcProvider(rpcUrls[chain])
    const balance = await provider.getBalance(address)

    return JSON.stringify({
      address,
      chain,
      balance_wei: balance.toString(),
      balance_eth: ethers.formatEther(balance),
    })
  } catch (error: any) {
    return JSON.stringify({ error: `Failed to get balance: ${error.message}` })
  }
}
