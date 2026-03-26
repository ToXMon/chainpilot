'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import Sidebar from '@/components/Sidebar'
import ChatMessage from '@/components/ChatMessage'
import ChatInput from '@/components/ChatInput'
import TxConfirmationCard from '@/components/TxConfirmationCard'
import ShareCard from '@/components/ShareCard'
import { executeTokenTransfer } from '@/lib/executeTransaction'

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

interface TransactionProposal {
  type: 'transaction_proposal'
  action: string
  tokenAddress: string
  toAddress: string
  toAddressDisplay?: string
  amount: string
  parsedAmount?: string
  token: { name: string; symbol: string; decimals: number }
  chain: string
  estimatedGas: string
  estimatedGasUsd: string
  gasSponsored: boolean
}

interface TxState {
  proposal: TransactionProposal
  status: 'pending' | 'confirming' | 'success' | 'error'
  txHash?: string
  explorerUrl?: string
  errorMessage?: string
  showShare?: boolean
}

interface SuggestedPrompt {
  text: string
  icon: string
  hot?: boolean
}

const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  { text: 'Send 5 USDC to vitalik.eth on Base', icon: 'arrow-up-right', hot: true },
  { text: 'Check my wallet balance', icon: 'wallet' },
  { text: "What's the gas price on Ethereum?", icon: 'zap' },
  { text: 'Resolve vitalik.eth to an address', icon: 'search' },
]

const PROMPT_ICONS: Record<string, React.ReactNode> = {
  'arrow-up-right': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
    </svg>
  ),
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
}

function truncateAddress(addr: string): string {
  if (!addr || addr.length <= 13) return addr || ''
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export default function Home() {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy()
  const walletAddress = user?.wallet?.address || null

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [txStates, setTxStates] = useState<Map<string, TxState>>(new Map())
  const [walletCreationTime, setWalletCreationTime] = useState<number | null>(null)
  const [loginStartTime, setLoginStartTime] = useState<number | null>(null)
  const [prefunding, setPrefunding] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent, txStates, scrollToBottom])

  // Wallet creation timer
  useEffect(() => {
    if (authenticated && user?.wallet?.address && loginStartTime) {
      setWalletCreationTime(Math.round((Date.now() - loginStartTime) / 1000))
      setLoginStartTime(null)
    }
  }, [authenticated, user?.wallet?.address, loginStartTime])

  useEffect(() => {
    if (ready && authenticated) fetchConversations()
  }, [ready, authenticated])

  async function fetchConversations() {
    try {
      const token = await getAccessToken()
      const res = await fetch('/api/history', {
        headers: { Authorization: `Bearer ${token}` },
      })
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
    setTxStates(new Map())
    try {
      const token = await getAccessToken()
      const res = await fetch(`/api/history/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
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
      const token = await getAccessToken()
      await fetch('/api/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      })
      if (activeConversationId === id) {
        setActiveConversationId(null)
        setMessages([])
        setStreamingContent('')
        setTxStates(new Map())
      }
      fetchConversations()
    } catch (err) {
      console.error('Failed to delete conversation:', err)
    }
  }

  async function handlePrefund() {
    if (!authenticated || prefunding) return
    setPrefunding(true)
    try {
      const token = await getAccessToken()
      const res = await fetch('/api/prefund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ chain: 'base' }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `5 USDC has been sent to your wallet on Base! [View transaction](${data.explorerUrl})\n\nYou can now ask me to send tokens — try "Send 1 USDC to vitalik.eth on Base".`,
          createdAt: new Date().toISOString(),
        }])
      } else {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.error || 'Could not claim prefund. You may have already received it.',
          createdAt: new Date().toISOString(),
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Something went wrong claiming the prefund. Please try again.',
        createdAt: new Date().toISOString(),
      }])
    } finally {
      setPrefunding(false)
    }
  }

  function handleTxExecute(proposalId: string) {
    return async () => {
      const txState = txStates.get(proposalId)
      if (!txState || !user?.wallet) return

      setTxStates(prev => new Map(prev).set(proposalId, { ...txState, status: 'confirming' }))

      try {
        const provider = await user.wallet.getEthersProvider()
        const result = await executeTokenTransfer({
          provider,
          tokenAddress: txState.proposal.tokenAddress,
          toAddress: txState.proposal.toAddress,
          amount: txState.proposal.amount,
          decimals: txState.proposal.token.decimals,
          chain: txState.proposal.chain,
        })

        setTxStates(prev => new Map(prev).set(proposalId, {
          ...txState,
          status: 'success',
          txHash: result.txHash,
          explorerUrl: result.explorerUrl,
          showShare: true,
        }))

        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Transaction confirmed! Sent ${txState.proposal.amount} ${txState.proposal.token.symbol} on ${txState.proposal.chain}. [View on explorer](${result.explorerUrl})`,
          createdAt: new Date().toISOString(),
        }])
      } catch (error: any) {
        setTxStates(prev => new Map(prev).set(proposalId, {
          ...txState,
          status: 'error',
          errorMessage: 'Transaction failed. Please try again.',
        }))
      }
    }
  }

  function handleTxReject(proposalId: string) {
    return () => {
      setTxStates(prev => {
        const next = new Map(prev)
        next.delete(proposalId)
        return next
      })
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Transaction rejected. Let me know if you\'d like to try something else.',
        createdAt: new Date().toISOString(),
      }])
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
      const token = await getAccessToken()
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message,
          conversationId: activeConversationId,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!res.ok) {
        if (res.status === 401) {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: 'Your session has expired. Please log in again.',
            createdAt: new Date().toISOString(),
          }])
          return
        }
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
                let parsed: any = null
                try { parsed = JSON.parse(data.result) } catch {}

                if (parsed?.type === 'transaction_proposal') {
                  const proposalId = crypto.randomUUID()
                  setTxStates(prev => new Map(prev).set(proposalId, {
                    proposal: parsed,
                    status: 'pending',
                  }))
                  setMessages(prev => [...prev, {
                    id: proposalId,
                    role: 'tx_proposal',
                    content: data.result,
                    toolName: data.name,
                    createdAt: new Date().toISOString(),
                  }])
                } else {
                  setMessages(prev => [...prev, {
                    id: crypto.randomUUID(),
                    role: 'tool_result',
                    content: data.result,
                    toolName: data.name,
                    createdAt: new Date().toISOString(),
                  }])
                }
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
    setTxStates(new Map())
    setSidebarOpen(false)
  }

  function handleLogin() {
    setLoginStartTime(Date.now())
    login()
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

          {/* Wallet Auth */}
          <div className="flex items-center gap-2">
            {!ready ? (
              <div className="w-28 h-9 rounded-lg bg-dark-hover border border-dark-border animate-pulse" />
            ) : !authenticated ? (
              <button
                onClick={handleLogin}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/20 hover:border-indigo-500/50 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                </svg>
                Get your wallet
              </button>
            ) : (
              <>
                <button
                  onClick={() => { navigator.clipboard.writeText(walletAddress || '') }}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-card border border-dark-border hover:border-dark-muted transition-colors"
                  title="Click to copy address"
                >
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-xs font-mono text-dark-text">
                    {truncateAddress(walletAddress || '')}
                  </span>
                  <svg className="w-3 h-3 text-dark-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 text-xs text-dark-muted hover:text-dark-text bg-dark-hover border border-dark-border rounded-lg transition-colors"
                >
                  Logout
                </button>
              </>
            )}
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
                AI agent with a wallet. Send tokens, check balances, explore chains — through chat.
              </p>

              {/* Wallet creation timer */}
              {walletCreationTime && (
                <div className="mb-6 flex flex-col items-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-400/10 border border-green-400/30">
                    <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-bold text-green-400">Wallet created in {walletCreationTime}s</span>
                  </div>
                  <span className="text-xs text-dark-muted mt-1.5">No seed phrase. No browser extension.</span>
                </div>
              )}

              {/* Prefund button — shown after login if no messages yet */}
              {authenticated && !walletCreationTime && (
                <button
                  onClick={handlePrefund}
                  disabled={prefunding}
                  className="mb-6 flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 rounded-xl transition-all shadow-lg shadow-green-500/20"
                >
                  {prefunding ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                  )}
                  {prefunding ? 'Claiming...' : 'Claim 5 USDC on Base'}
                </button>
              )}

              {/* Login CTA for unauthenticated users */}
              {!authenticated && (
                <button
                  onClick={handleLogin}
                  className="mb-6 flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                  </svg>
                  Create your smart wallet — no seed phrase needed
                </button>
              )}

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

              {/* Hot prompt label */}
              <div className="mt-3 flex items-center gap-1 text-xs text-indigo-400">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span>Try sending to an ENS name</span>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              {messages.map((msg) => {
                if (msg.role === 'tx_proposal' && msg.id) {
                  const txState = txStates.get(msg.id)
                  if (txState) {
                    return (
                      <div key={msg.id}>
                        <TxConfirmationCard
                          proposal={txState.proposal}
                          onExecute={handleTxExecute(msg.id)}
                          onReject={handleTxReject(msg.id)}
                          status={txState.status}
                          txHash={txState.txHash}
                          explorerUrl={txState.explorerUrl}
                          errorMessage={txState.errorMessage}
                        />
                        {txState.showShare && txState.status === 'success' && (
                          <ShareCard
                            txHash={txState.txHash || ''}
                            amount={txState.proposal.amount}
                            token={txState.proposal.token.symbol}
                            to={txState.proposal.toAddressDisplay || txState.proposal.toAddress}
                            chain={txState.proposal.chain}
                          />
                        )}
                      </div>
                    )
                  }
                }

                return (
                  <ChatMessage
                    key={msg.id}
                    id={msg.id}
                    role={msg.role}
                    content={msg.content}
                    toolName={msg.toolName}
                    toolArgs={msg.toolArgs}
                  />
                )
              })}
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

        <ChatInput onSend={sendMessage} disabled={isLoading || !authenticated} />
      </main>
    </div>
  )
}
