import { venice } from './venice'
import { zodFunction } from 'openai/helpers/zod'
import { systemPrompt } from './systemPrompt'
import { tools } from './tools'
import { runTool } from './toolRunner'
import type { AIMessage } from './types'

export async function* runAgent({
  messages,
  onToolCall,
}: {
  messages: AIMessage[]
  onToolCall?: (name: string, args: any) => void
}) {
  const formattedTools = tools.map(zodFunction)

  let iterations = 0

  while (true) {
    if (++iterations > 10) {
      yield { type: 'text', content: 'I need to stop here — too many tool calls in a row. Please simplify your request.' }
      return messages
    }
    const response = await venice.chat.completions.create({
      model: 'llama-3.3-70b',
      temperature: 0.1,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      tools: formattedTools,
      tool_choice: 'auto',
      parallel_tool_calls: false,
      stream: false,
    })

    const message = response.choices[0].message
    messages.push(message as AIMessage)

    if (message.content) {
      yield { type: 'text', content: message.content }
      return messages
    }

    if (message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        onToolCall?.(toolCall.function.name, JSON.parse(toolCall.function.arguments || '{}'))
        yield { type: 'tool_call', name: toolCall.function.name, args: toolCall.function.arguments }

        const toolResponse = await runTool(toolCall, messages.find(m => m.role === 'user')?.content as string || '')
        messages.push({
          role: 'tool',
          content: toolResponse,
          tool_call_id: toolCall.id,
        } as AIMessage)

        yield { type: 'tool_result', name: toolCall.function.name, result: toolResponse }
      }
    }
  }
}
