'use client'

import { useState } from 'react'

interface ChatMessageProps {
  id: string
  role: string
  content: string | null
  toolName?: string | null
  toolArgs?: string | null
}

function renderSafeContent(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  // Split by code blocks first
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Text before code block
    if (match.index > lastIndex) {
      parts.push(...renderInlineText(text.slice(lastIndex, match.index)))
    }
    // Code block
    parts.push(
      <pre key={`code-${match.index}`}>
        <code>{match[2]}</code>
      </pre>
    )
    lastIndex = match.index + match[0].length
  }

  // Remaining text after last code block
  if (lastIndex < text.length) {
    parts.push(...renderInlineText(text.slice(lastIndex)))
  }

  return parts
}

function renderInlineText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  // Process inline formatting: bold, inline code, links
  const inlineRegex = /(\*\*([^*]+)\*\*)|(`([^`]+)`)|(```)|(?<!!)\[([^\]]+)\]\(([^)]+)\)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = inlineRegex.exec(text)) !== null) {
    // Plain text before this match
    if (match.index > lastIndex) {
      parts.push(<span key={`t-${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>)
    }

    if (match[2]) {
      // Bold: **text**
      parts.push(<strong key={`b-${match.index}`} className="text-zinc-100 font-semibold">{match[2]}</strong>)
    } else if (match[4] !== undefined) {
      // Inline code: `code`
      parts.push(<code key={`c-${match.index}`}>{match[4]}</code>)
    } else if (match[5]) {
      // Stray ```
      parts.push(<code key={`s-${match.index}`}>{'```'}</code>)
    } else if (match[6] && match[7]) {
      // Link: [text](url)
      parts.push(
        <a
          key={`a-${match.index}`}
          href={match[7]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-blue hover:text-blue-400 underline underline-offset-2"
        >
          {match[6]}
        </a>
      )
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(<span key={`t-${lastIndex}`}>{text.slice(lastIndex)}</span>)
  }

  return parts
}

function tryParseJson(str: string): string | null {
  try {
    return JSON.stringify(JSON.parse(str), null, 2)
  } catch {
    return null
  }
}

export default function ChatMessage({ role, content, toolName, toolArgs }: ChatMessageProps) {
  const [expanded, setExpanded] = useState(false)

  if (role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="chat-bubble-user">
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    )
  }

  if (role === 'tool_call' || role === 'assistant_tool_call') {
    const prettyArgs = toolArgs ? tryParseJson(toolArgs) || toolArgs : '{}'
    return (
      <div className="flex justify-start mb-2 ml-2">
        <div className="tool-card">
          <div
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={() => setExpanded(!expanded)}
          >
            <svg className="w-3.5 h-3.5 text-purple-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-purple-300 font-medium text-xs">{toolName || 'tool_call'}</span>
            <svg className={`w-3 h-3 text-dark-muted transition-transform ${expanded ? 'rotate-180' : ''}`} fill="no" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          {expanded && (
            <pre><code>{prettyArgs}</code></pre>
          )}
        </div>
      </div>
    )
  }

  if (role === 'tool_result') {
    const prettyResult = content ? tryParseJson(content) || content : 'No result'
    return (
      <div className="flex justify-start mb-2 ml-2">
        <div className="tool-card tool-card-result">
          <div
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={() => setExpanded(!expanded)}
          >
            <svg className="w-3.5 h-3.5 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-300 font-medium text-xs">{toolName || 'result'}</span>
            <svg className={`w-3 h-3 text-dark-muted transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          {expanded && (
            <pre><code>{prettyResult}</code></pre>
          )}
        </div>
      </div>
    )
  }

  // Assistant message — XSS-safe rendering
  if (!content) return null

  return (
    <div className="flex justify-start mb-4">
      <div className="chat-bubble-assistant">
        <div className="text-sm leading-relaxed">
          {renderSafeContent(content)}
        </div>
      </div>
    </div>
  )
}
