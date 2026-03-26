import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ethers } from 'ethers'
import { withAuth, type AuthResult } from '@/lib/auth'

const RPC_URLS: Record<string, string> = {
  ethereum: process.env.ETH_RPC_URL || 'https://eth.llamarpc.com',
  bsc: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
  polygon: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
  arbitrum: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
  base: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
}

const USDC_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
]

const prefundAttempts = new Map<string, number>()
const PREFUND_WINDOW_MS = 60 * 60 * 1000
const MAX_ATTEMPTS_PER_WINDOW = 3

export const POST = withAuth(async (req: NextRequest, _ctx: any, auth: AuthResult) => {
  try {
    const address = auth.walletAddress
    if (!address) {
      return NextResponse.json({ error: 'No wallet found for this account' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const targetChain = body.chain || 'base'
    if (!RPC_URLS[targetChain]) {
      return NextResponse.json({ error: 'Unsupported chain' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { walletAddress: address.toLowerCase() },
    })

    if (existingUser?.isPrefunded) {
      return NextResponse.json({ error: 'This wallet has already been prefunded' }, { status: 400 })
    }

    const normalizedAddress = address.toLowerCase()
    const now = Date.now()
    const attempts = prefundAttempts.get(normalizedAddress) || 0
    if (attempts >= MAX_ATTEMPTS_PER_WINDOW) {
      return NextResponse.json({ error: 'Too many prefund requests. Try again later.' }, { status: 429 })
    }
    prefundAttempts.set(normalizedAddress, attempts + 1)
    setTimeout(() => {
      const current = prefundAttempts.get(normalizedAddress) || 0
      if (current <= 1) prefundAttempts.delete(normalizedAddress)
      else prefundAttempts.set(normalizedAddress, current - 1)
    }, PREFUND_WINDOW_MS)

    const treasuryKey = process.env.TREASURY_PRIVATE_KEY
    const usdcAddress = process.env.TREASURY_USDC_ADDRESS

    if (!treasuryKey || !usdcAddress) {
      console.error('[PREFUND] Treasury wallet not configured')
      return NextResponse.json({ error: 'Prefund service unavailable' }, { status: 500 })
    }

    const provider = new ethers.JsonRpcProvider(RPC_URLS[targetChain])
    let treasuryWallet: ethers.Wallet
    try {
      treasuryWallet = new ethers.Wallet(treasuryKey, provider)
    } catch (error) {
      console.error('[PREFUND] Invalid treasury key configuration')
      return NextResponse.json({ error: 'Prefund service unavailable' }, { status: 500 })
    }

    const usdcContract = new ethers.Contract(usdcAddress, USDC_ABI, treasuryWallet)

    const decimals = await usdcContract.decimals()
    const prefundAmount = ethers.parseUnits('5.0', Number(decimals))

    const treasuryBalance = await usdcContract.balanceOf(treasuryWallet.address)
    if (treasuryBalance < prefundAmount) {
      console.error('[PREFUND] Insufficient treasury balance')
      return NextResponse.json({ error: 'Prefund service unavailable' }, { status: 500 })
    }

    const tx = await usdcContract.transfer(address, prefundAmount)
    const receipt = await tx.wait()

    if (!receipt || receipt.status !== 1) {
      console.error('[PREFUND] Transfer transaction failed')
      return NextResponse.json({ error: 'Prefund failed' }, { status: 500 })
    }

    await prisma.user.upsert({
      where: { walletAddress: address.toLowerCase() },
      update: { isPrefunded: true },
      create: {
        walletAddress: address.toLowerCase(),
        isPrefunded: true,
      },
    })

    const EXPLORER_URLS: Record<string, string> = {
      ethereum: 'https://etherscan.io',
      bsc: 'https://bscscan.com',
      polygon: 'https://polygonscan.com',
      arbitrum: 'https://arbiscan.io',
      base: 'https://basescan.org',
    }

    return NextResponse.json({
      success: true,
      txHash: receipt.hash,
      amount: '5.0',
      token: 'USDC',
      chain: targetChain,
      explorerUrl: `${EXPLORER_URLS[targetChain] || ''}/tx/${receipt.hash}`,
    })
  } catch (error: any) {
    console.error('[PREFUND]', error.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
