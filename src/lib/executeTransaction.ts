import { ethers } from 'ethers'

const RPC_URLS: Record<string, string> = {
  ethereum: process.env.ETH_RPC_URL || 'https://eth.llamarpc.com',
  bsc: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
  polygon: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
  arbitrum: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
  base: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
}

interface ExecuteTxParams {
  provider: any // Privy wallet provider
  tokenAddress: string
  toAddress: string
  amount: string
  decimals: number
  chain: string
}

export async function executeTokenTransfer({
  provider,
  tokenAddress,
  toAddress,
  amount,
  decimals,
  chain,
}: ExecuteTxParams): Promise<{ txHash: string; explorerUrl: string }> {
  const rpcUrl = RPC_URLS[chain]
  if (!rpcUrl) {
    throw new Error(`Unsupported chain: ${chain}`)
  }

  // Resolve ENS if needed
  let resolvedAddress = toAddress
  if (toAddress.endsWith('.eth')) {
    const jsonProvider = new ethers.JsonRpcProvider(rpcUrl)
    const resolved = await jsonProvider.resolveName(toAddress)
    if (!resolved) throw new Error(`Could not resolve ENS: ${toAddress}`)
    resolvedAddress = resolved
  }

  const parsedAmount = ethers.parseUnits(amount, decimals)

  // Use the Privy provider to get a signer and execute
  const signer = await provider.getSigner()

  const ERC20_ABI = [
    'function transfer(address to, uint256 amount) returns (bool)',
  ] as const

  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer)

  const tx = await contract.transfer(resolvedAddress, parsedAmount)
  const receipt = await tx.wait()

  if (!receipt || receipt.status !== 1) {
    throw new Error('Transaction failed or was reverted')
  }

  const EXPLORER_URLS: Record<string, string> = {
    ethereum: 'https://etherscan.io',
    bsc: 'https://bscscan.com',
    polygon: 'https://polygonscan.com',
    arbitrum: 'https://arbiscan.io',
    base: 'https://basescan.org',
  }

  const explorerUrl = `${EXPLORER_URLS[chain] || ''}/tx/${receipt.hash}`

  return {
    txHash: receipt.hash,
    explorerUrl,
  }
}
