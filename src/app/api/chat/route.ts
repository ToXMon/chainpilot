import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runAgent } from '@/lib/agent'
import { withAuth, type AuthResult } from '@/lib/auth'
import type { AIMessage } from '@/lib/types'
import { v4 as uuidv4 } from 'uuid'

export const POST = withAuth(async (req: NextRequest, _ctx: any, auth: AuthResult) => {
  try {
    const { message, conversationId } = await req.json()

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid message' }), { status: 400 })
    }

    let convoId = conversationId

    if (!convoId) {
      const conversation = await prisma.conversation.create({
        data: {
          title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
          userId: auth.userId,
        },
      })
      convoId = conversation.id
    } else {
      const existing = await prisma.conversation.findFirst({
        where: { id: convoId, userId: auth.userId },
      })
      if (!existing) {
        return new Response(JSON.stringify({ error: 'Conversation not found' }), { status: 404 })
      }
      await prisma.conversation.update({
        where: { id: convoId },
        data: { updatedAt: new Date() },
      })
    }

    await prisma.message.create({
      data: {
        id: uuidv4(),
        role: 'user',
        content: message,
        conversationId: convoId,
      },
    })

    const existingMessages = await prisma.message.findMany({
      where: { conversationId: convoId },
      orderBy: { createdAt: 'asc' },
    })

    const messages: AIMessage[] = existingMessages.map((m) => {
      if (m.role === 'user') {
        return { role: 'user' as const, content: m.content || '' }
      }
      if (m.role === 'tool') {
        return { role: 'tool' as const, content: m.content || '', tool_call_id: m.toolCallId || '' }
      }
      if (m.role === 'assistant') {
        const msg: any = { role: 'assistant' as const, content: m.content || null }
        if (m.toolCallId && m.toolName && m.toolArgs) {
          msg.tool_calls = [{
            id: m.toolCallId,
            type: 'function',
            function: { name: m.toolName, arguments: m.toolArgs },
          }]
        }
        return msg
      }
      return { role: 'user' as const, content: m.content || '' }
    })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: any) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        }

        try {
          const agentGen = runAgent({ messages })
          let assistantContent = ''
          const toolMessages: Array<{ role: string; content: string; toolCallId: string; toolName: string; toolArgs: string }> = []

          for await (const event of agentGen) {
            if (event.type === 'text') {
              assistantContent = event.content
              send('text', { content: event.content })
            } else if (event.type === 'tool_call') {
              send('tool_call', { name: event.name, args: event.args })
            } else if (event.type === 'tool_result') {
              toolMessages.push({
                role: 'tool',
                content: event.result,
                toolCallId: '',
                toolName: event.name,
                toolArgs: '',
              })
              send('tool_result', { name: event.name, result: event.result })
            }
          }

          if (assistantContent) {
            await prisma.message.create({
              data: {
                id: uuidv4(),
                role: 'assistant',
                content: assistantContent,
                conversationId: convoId,
              },
            })
          }

          for (const tm of toolMessages) {
            await prisma.message.create({
              data: {
                id: uuidv4(),
                role: tm.role,
                content: tm.content,
                toolName: tm.toolName,
                conversationId: convoId,
              },
            })
          }

          send('done', { conversationId: convoId })
        } catch (error: any) {
          console.error('[CHAT]', error.message)
          send('error', { error: 'An error occurred processing your request' })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: any) {
    console.error('[CHAT]', error.message)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
})
