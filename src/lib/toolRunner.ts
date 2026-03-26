import type OpenAI from 'openai'
import { toolDefinitions } from './tools'

type ToolCall = OpenAI.Chat.Completions.ChatCompletionMessageToolCall

export async function runTool(toolCall: ToolCall, userMessage: string): Promise<string> {
  const { name, arguments: argsString } = toolCall.function

  let parsedArgs: any
  try {
    parsedArgs = JSON.parse(argsString || '{}')
  } catch {
    return JSON.stringify({ error: `Failed to parse tool arguments: ${argsString}` })
  }

  const toolFn = toolDefinitions[name]

  if (!toolFn) {
    return JSON.stringify({ error: `Unknown tool: ${name}. Available tools: ${Object.keys(toolDefinitions).join(', ')}` })
  }

  try {
    const result = await toolFn({ userMessage, toolArgs: parsedArgs })
    return result
  } catch (error: any) {
    return JSON.stringify({ error: `Tool execution failed for ${name}: ${error.message}` })
  }
}
