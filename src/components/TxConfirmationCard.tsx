'use client'

import { useState } from 'react'

interface TokenInfo {
  name: string
  symbol: string
  decimals: number
}

interface TransactionProposal {
  type: 'transaction_proposal'
  action: string
  tokenAddress: string
  toAddress: string
  toAddressDisplay?: string
  amount: string
  parsedAmount?: string
  token: TokenInfo
  chain: string
  estimatedGas: string
  estimatedGasUsd: string
  gasSponsored: boolean
}

interface TxConfirmationCardProps {
  proposal: TransactionProposal
  onExecute: () => Promise<void>
  onReject: () => void
  status: 'pending' | 'confirming' | 'success' | 'error'
  txHash?: string
  explorerUrl?: string
  errorMessage?: string
}

function truncateAddress(addr: string): string {
  if (addr.length <= 13) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}

const CHAIN_CONFIG: Record<string, { label: string; color: string }> = {
  ethereum: { label: 'Ethereum', color: 'bg-[#627EEA]/15 text-[#627EEA] border-[#627EEA]/30' },
  base: { label: 'Base', color: 'bg-[#0052FF]/15 text-[#0052FF] border-[#0052FF]/30' },
  arbitrum: { label: 'Arbitrum', color: 'bg-[#28A0F0]/15 text-[#28A0F0] border-[#28A0F0]/30' },
  polygon: { label: 'Polygon', color: 'bg-[#8247E5]/15 text-[#8247E5] border-[#8247E5]/30' },
  bsc: { label: 'BSC', color: 'bg-[#F3BA2F]/15 text-[#F3BA2F] border-[#F3BA2F]/30' },
}

export default function TxConfirmationCard({
  proposal,
  onExecute,
  onReject,
  status,
  txHash,
  explorerUrl,
  errorMessage,
}: TxConfirmationCardProps) {
  const [copied, setCopied] = useState(false)
  const chainConfig = CHAIN_CONFIG[proposal.chain] || { label: proposal.chain, color: 'bg-dark-hover text-dark-text border-dark-border' }

  const displayAddress = proposal.toAddressDisplay || proposal.toAddress
  const isEns = displayAddress.endsWith('.eth')

  const handleCopy = () => {
    copyToClipboard(proposal.toAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-3 max-w-sm">
      <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 overflow-hidden glow-indigo">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-indigo-500/20">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-indigo-300">Transaction Proposal</span>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-2.5">
          {/* To Address */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-dark-muted">To</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono text-dark-text">
                {isEns ? displayAddress : truncateAddress(displayAddress)}
              </span>
              {isEns && (
                <span className="text-[10px] text-dark-subtle font-mono">
                  ({truncateAddress(proposal.toAddress)})
                </span>
              )}
              <button
                onClick={handleCopy}
                className="text-dark-muted hover:text-dark-text transition-colors"
                title="Copy address"
              >
                {copied ? (
                  <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-dark-muted">Amount</span>
            <span className="text-sm font-semibold text-dark-text">
              {proposal.amount} {proposal.token.symbol}
            </span>
          </div>

          {/* Token Name */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-dark-muted">Token</span>
            <span className="text-xs text-dark-text">{proposal.token.name}</span>
          </div>

          {/* Chain Badge — color coded */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-dark-muted">Chain</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${chainConfig.color}`}>
              {chainConfig.label}
            </span>
          </div>

          {/* Gas — upgraded $0.00 display */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-dark-muted">Gas</span>
            {proposal.gasSponsored ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-400/10 border border-green-400/25 glow-green">
                <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
                <span className="text-base font-bold text-green-400 tracking-tight">$0.00</span>
                <span className="text-xs text-green-400/60 font-medium">gas sponsored</span>
              </div>
            ) : (
              <span className="text-xs text-dark-text">{proposal.estimatedGasUsd}</span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-indigo-500/20 bg-indigo-500/5">
          {status === 'pending' && (
            <div className="flex items-center gap-2">
              <button
                onClick={onReject}
                className="flex-1 px-4 py-2 text-sm font-medium text-dark-muted hover:text-dark-text bg-dark-hover border border-dark-border rounded-lg transition-colors"
              >
                Reject
              </button>
              <button
                onClick={onExecute}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-lg transition-all flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
                Execute Transaction
              </button>
            </div>
          )}

          {status === 'confirming' && (
            <div className="flex items-center justify-center gap-2 py-2">
              <svg className="w-4 h-4 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm text-indigo-300">Confirming...</span>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-2 py-2 animate-tx-success">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-green-400">Confirmed</span>
              </div>
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                >
                  View on explorer →
                </a>
              )}
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-red-400">Failed</span>
              </div>
              {errorMessage && (
                <span className="text-xs text-dark-muted text-center max-w-[250px]">{errorMessage}</span>
              )}
              <button
                onClick={onExecute}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
