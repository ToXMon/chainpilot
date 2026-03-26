import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  ctx: any
) {
  try {
    const { id } = ctx.params

    const convo = await prisma.conversation.findFirst({
      where: { id },
    })

    if (!convo) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
    })

    const result = messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      toolName: m.toolName,
      toolArgs: m.toolArgs,
      createdAt: m.createdAt.toISOString(),
    }))

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[HISTORY_ID]', error.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
