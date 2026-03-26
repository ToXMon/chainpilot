import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, type AuthResult } from '@/lib/auth'

export const GET = withAuth(async (_req: NextRequest, _ctx: any, auth: AuthResult) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId: auth.userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, role: true },
        },
      },
    })

    const result = conversations.map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      lastMessage: c.messages[0]?.content?.slice(0, 100) || null,
    }))

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[HISTORY_GET]', error.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const DELETE = withAuth(async (req: NextRequest, _ctx: any, auth: AuthResult) => {
  try {
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 })
    }

    const convo = await prisma.conversation.findFirst({
      where: { id, userId: auth.userId },
    })

    if (!convo) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    await prisma.message.deleteMany({ where: { conversationId: id } })
    await prisma.conversation.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[HISTORY_DELETE]', error.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
