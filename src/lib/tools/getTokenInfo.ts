import { z } from 'zod'
import { ethers } from 'ethers'

export const getTokenInfoSchema = z.object({
  tokenAddress: z.string().describe('ERC-20 token contract address'),
  chain: z.enum(['ethereum', 'bsc', 'polygon', 'arbitrum', 'base']).optional().default('ethereum'),
})

const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
]

export async function getTokenInfo({ toolArgs }: { userMessage: string; toolArgs: z.infer<typeof getTokenInfoSchema> }) {
  try {
    const { tokenAddress, chain } = getTokenInfoSchema.parse(toolArgs)

    if (!ethers.isAddress(tokenAddress)) {
      return JSON.stringify({ error: 'Invalid token contract address format' })
    }

    const rpcUrls: Record<string, string> = {
      ethereum: process.env.ETH_RPC_URL || 'https://eth.llamarpc.com',
      bsc: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
      polygon: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
      arbitrum: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
      base: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    }

    const provider = new ethers.JsonRpcProvider(rpcUrls[chain])
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)

    const [name, symbol, decimals, totalSupply] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.decimals(),
      contract.totalSupply(),
    ])

    return JSON.stringify({
      address: tokenAddress,
      name,
      symbol,
      decimals: Number(decimals),
      total_supply: totalSupply.toString(),
      formatted_supply: ethers.formatUnits(totalSupply, decimals),
      chain,
    })
  } catch (error: any) {
    return JSON.stringify({ error: `Failed to get token info: ${error.message}` })
  }
}
