'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import ChatMessage from '@/components/ChatMessage'
import ChatInput from '@/components/ChatInput'

interface Conversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  lastMessage: string | null
}

interface Message {
  id: string
  role: string
  content: string | null
  toolName?: string | null
  toolArgs?: string | null
  createdAt: string
}

interface SuggestedPrompt {
  text: string
  icon: string
  hot?: boolean
}

const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  { text: 'Check vitalik.eth balance on Ethereum', icon: 'wallet', hot: true },
  { text: "What's the gas price on Base?", icon: 'zap' },
  { text: 'Get info about USDC on Ethereum', icon: 'search' },
  { text: 'What chain ID is Arbitrum?', icon: 'cube' },
]

const PROMPT_ICONS: Record<string, React.ReactNode> = {
  'wallet': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
    </svg>
  ),
  'zap': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  'search': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  ),
  'cube': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  ),
}

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, scrollToBottom])

  useEffect(() => {
    fetchConversations()
  }, [])

  async function fetchConversations() {
    try {
      const res = await fetch('/api/history')
      if (res.ok) {
        const data = await res.json()
        setConversations(data)
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err)
    }
  }

  async function loadConversation(id: string) {
    setActiveConversationId(id)
    setMessages([])
    setStreamingContent('')
    try {
      const res = await fetch(`/api/history/${id}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
      }
    } catch (err) {
      console.error('Failed to load conversation:', err)
    }
  }

  async function deleteConversation(id: string) {
    try {
      await fetch('/api/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (activeConversationId === id) {
        setActiveConversationId(null)
        setMessages([])
        setStreamingContent('')
      }
      fetchConversations()
    } catch (err) {
      console.error('Failed to delete conversation:', err)
    }
  }

  async function sendMessage(message: string) {
    setIsLoading(true)
    setStreamingContent('')

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])

    abortControllerRef.current = new AbortController()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          conversationId: activeConversationId,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!res.ok) {
        throw new Error('Failed to send message')
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''
      let newConvoId: string | null = null
      let currentText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        let currentEvent = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith('data: ') && currentEvent) {
            try {
              const data = JSON.parse(line.slice(6))

              if (currentEvent === 'text') {
                currentText = data.content
                setStreamingContent(data.content)
              } else if (currentEvent === 'tool_call') {
                setMessages(prev => [...prev, {
                  id: crypto.randomUUID(),
                  role: 'tool_call',
                  content: null,
                  toolName: data.name,
                  toolArgs: data.args,
                  createdAt: new Date().toISOString(),
                }])
              } else if (currentEvent === 'tool_result') {
                setMessages(prev => [...prev, {
                  id: crypto.randomUUID(),
                  role: 'tool_result',
                  content: data.result,
                  toolName: data.name,
                  createdAt: new Date().toISOString(),
                }])
              } else if (currentEvent === 'done') {
                newConvoId = data.conversationId
              } else if (currentEvent === 'error') {
                console.error('[CHAT_STREAM]', data.error)
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
            currentEvent = ''
          }
        }
      }

      if (currentText) {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: currentText,
          createdAt: new Date().toISOString(),
        }])
      }

      setStreamingContent('')

      if (newConvoId && !activeConversationId) {
        setActiveConversationId(newConvoId)
      }
      fetchConversations()
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Chat error:', err)
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Something went wrong. Please try again.',
          createdAt: new Date().toISOString(),
        }])
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  function handleNewChat() {
    setActiveConversationId(null)
    setMessages([])
    setStreamingContent('')
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={loadConversation}
        onNewChat={handleNewChat}
        onDelete={deleteConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-dark-border bg-dark-card/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden w-9 h-9 rounded-lg bg-dark-hover border border-dark-border flex items-center justify-center text-dark-muted hover:text-dark-text transition-colors"
              aria-label="Open sidebar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-sm font-semibold">ChainPilot</h1>
            </div>
            <span className="hidden sm:inline-flex text-xs text-dark-muted bg-dark-hover px-2 py-0.5 rounded-full border border-dark-border">
              Web3 Agent
            </span>
          </div>
        </header>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2">ChainPilot</h2>
              <p className="text-dark-muted text-sm mb-6">
                AI-powered blockchain intelligence. Check balances, gas prices, token info, and explore chains — all through chat.
              </p>

              {/* Suggested prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt.text}
                    onClick={() => sendMessage(prompt.text)}
                    className={`suggested-prompt flex items-center gap-2.5 text-left ${
                      prompt.hot
                        ? 'border-indigo-500/40 bg-indigo-500/5 animate-pulse-border'
                        : ''
                    }`}
                  >
                    <span className={`shrink-0 ${prompt.hot ? 'text-indigo-400' : 'text-dark-muted'}`}>
                      {PROMPT_ICONS[prompt.icon]}
                    </span>
                    <span className="text-sm">{prompt.text}</span>
                  </button>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-1 text-xs text-dark-muted">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span>Try asking about any blockchain data</span>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  id={msg.id}
                  role={msg.role}
                  content={msg.content}
                  toolName={msg.toolName}
                  toolArgs={msg.toolArgs}
                />
              ))}
              {streamingContent && (
                <div className="flex justify-start mb-4">
                  <div className="chat-bubble-assistant">
                    <p className="text-sm whitespace-pre-wrap">{streamingContent}</p>
                  </div>
                </div>
              )}
              {isLoading && !streamingContent && (
                <div className="flex justify-start mb-4">
                  <div className="chat-bubble-assistant">
                    <div className="typing-indicator flex items-center gap-1 py-1">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </main>
    </div>
  )
}
