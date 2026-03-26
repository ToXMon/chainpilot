import { z } from 'zod'
import { ethers } from 'ethers'

export const getTokenBalanceSchema = z.object({
  address: z.string().describe('Ethereum wallet address'),
  tokenAddress: z.string().describe('ERC-20 token contract address'),
  chain: z.enum(['ethereum', 'bsc', 'polygon', 'arbitrum', 'base']).optional().default('ethereum'),
})

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
]

export async function getTokenBalance({ toolArgs }: { userMessage: string; toolArgs: z.infer<typeof getTokenBalanceSchema> }) {
  try {
    const { address, tokenAddress, chain } = getTokenBalanceSchema.parse(toolArgs)

    if (!ethers.isAddress(address)) {
      return JSON.stringify({ error: 'Invalid wallet address format' })
    }
    if (!ethers.isAddress(tokenAddress)) {
      return JSON.stringify({ error: 'Invalid token address format' })
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

    const [balance, decimals, symbol, name] = await Promise.all([
      contract.balanceOf(address),
      contract.decimals(),
      contract.symbol(),
      contract.name(),
    ])

    const formattedBalance = ethers.formatUnits(balance, decimals)

    return JSON.stringify({
      address,
      token: tokenAddress,
      name,
      symbol,
      decimals: Number(decimals),
      balance: balance.toString(),
      formatted_balance: formattedBalance,
    })
  } catch (error: any) {
    return JSON.stringify({ error: `Failed to get token balance: ${error.message}` })
  }
}
