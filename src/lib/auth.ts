import { PrivyClient } from '@privy-io/server-auth'
import { NextRequest, NextResponse } from 'next/server'

const privyClient = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

export interface AuthResult {
  userId: string
  walletAddress: string | null
  privyId: string
}

export async function authenticateRequest(req: NextRequest): Promise<AuthResult> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing authorization header')
  }
  const token = authHeader.slice(7)
  const claims = await privyClient.verifyAuthToken(token)
  return {
    userId: claims.userId,
    walletAddress: claims.wallet?.address || null,
    privyId: claims.userId,
  }
}

export function withAuth(handler: Function) {
  return async (req: NextRequest, ctx: any) => {
    try {
      const auth = await authenticateRequest(req)
      return handler(req, ctx, auth)
    } catch (error: any) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
}
