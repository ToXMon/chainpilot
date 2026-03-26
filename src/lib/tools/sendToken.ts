import { z } from 'zod'
import { ethers } from 'ethers'

export const sendTokenSchema = z.object({
  tokenAddress: z.string().describe('ERC-20 token contract address'),
  toAddress: z.string().describe('Recipient wallet address or ENS name'),
  amount: z.string().describe('Amount in human-readable units (e.g. "5.0", not wei)'),
  chain: z.enum(['ethereum', 'bsc', 'polygon', 'arbitrum', 'base']).optional().default('base'),
})

const RPC_URLS: Record<string, string> = {
  ethereum: process.env.ETH_RPC_URL || 'https://eth.llamarpc.com',
  bsc: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
  polygon: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
  arbitrum: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
  base: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
}

const NATIVE_TOKEN_PRICES: Record<string, number> = {
  ethereum: 3000,
  bsc: 600,
  polygon: 0.7,
  arbitrum: 3000,
  base: 3000,
}

export async function sendToken({ userMessage, toolArgs }: { userMessage: string; toolArgs: z.infer<typeof sendTokenSchema> }) {
  try {
    const { tokenAddress, toAddress, amount, chain } = sendTokenSchema.parse(toolArgs)

    if (!ethers.isAddress(tokenAddress)) {
      return JSON.stringify({ error: 'Invalid token contract address format' })
    }

    const provider = new ethers.JsonRpcProvider(RPC_URLS[chain])

    // Resolve ENS if needed (Ethereum only)
    let resolvedToAddress = toAddress
    if (toAddress.endsWith('.eth')) {
      if (chain !== 'ethereum') {
        return JSON.stringify({ error: 'ENS resolution is only supported on Ethereum mainnet' })
      }
      const resolved = await provider.resolveName(toAddress)
      if (!resolved) {
        return JSON.stringify({ error: `Could not resolve ENS name: ${toAddress}` })
      }
      resolvedToAddress = resolved
    } else if (!ethers.isAddress(toAddress)) {
      return JSON.stringify({ error: 'Invalid recipient address format' })
    }

    // Get token info for display
    const ERC20_ABI = [
      'function decimals() view returns (uint8)',
      'function symbol() view returns (string)',
      'function name() view returns (string)',
    ]
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)
    const [decimals, symbol, name] = await Promise.all([
      tokenContract.decimals(),
      tokenContract.symbol(),
      tokenContract.name(),
    ])

    // Estimate gas for a transfer
    const TRANSFER_ABI = ['function transfer(address to, uint256 amount) returns (bool)']
    const transferContract = new ethers.Contract(tokenAddress, TRANSFER_ABI, provider)
    const parsedAmount = ethers.parseUnits(amount, Number(decimals))

    let estimatedGas: bigint
    try {
      estimatedGas = await transferContract.transfer.estimateGas(resolvedToAddress, parsedAmount)
    } catch {
      estimatedGas = BigInt(65000) // Fallback estimate
    }

    const gasPrice = await provider.getFeeData()
    const gasPriceWei = gasPrice.gasPrice || BigInt(0)
    const gasCostWei = estimatedGas * gasPriceWei
    const gasCostEth = ethers.formatEther(gasCostWei)
    const tokenPrice = NATIVE_TOKEN_PRICES[chain]
    const estimatedCostUsd = (Number(gasCostEth) * tokenPrice).toFixed(2)

    return JSON.stringify({
      type: 'transaction_proposal',
      action: 'send_token',
      tokenAddress,
      toAddress: resolvedToAddress,
      toAddressDisplay: toAddress.endsWith('.eth') ? toAddress : resolvedToAddress,
      amount,
      parsedAmount: parsedAmount.toString(),
      token: {
        name,
        symbol,
        decimals: Number(decimals),
      },
      chain,
      estimatedGas: gasCostEth,
      estimatedGasUsd: `$${estimatedCostUsd}`,
      gasSponsored: true,
    })
  } catch (error: any) {
    return JSON.stringify({ error: `Failed to prepare token transfer: ${error.message}` })
  }
}
