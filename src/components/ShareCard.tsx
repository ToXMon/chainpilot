'use client'

import { useState } from 'react'

interface ShareCardProps {
  txHash: string
  amount: string
  token: string
  to: string
  chain: string
  onClose?: () => void
}

const CHAIN_LABELS: Record<string, string> = {
  ethereum: 'Ethereum',
  base: 'Base',
  arbitrum: 'Arbitrum',
  polygon: 'Polygon',
  bsc: 'BSC',
}

export default function ShareCard({ txHash, amount, token, to, chain, onClose }: ShareCardProps) {
  const [copied, setCopied] = useState(false)

  const chainLabel = CHAIN_LABELS[chain] || chain
  const shareText = `I just used an AI agent to send ${amount} ${token} to ${to} on ${chainLabel}.

No wallet. No seed phrase. Gas: $0.00

Try it → chainpilot.xyz`

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-3 max-w-sm">
      {/* Separator */}
      <div className="border-t border-indigo-500/20 mb-3" />

      {/* Card */}
      <div className="rounded-xl bg-[#0d0d14] p-4 border border-dark-border">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-dark-text">Share this transaction</span>
        </div>

        {/* Preview text */}
        <div className="rounded-lg bg-dark-bg border border-dark-border p-3 mb-3">
          <p className="text-xs text-dark-muted leading-relaxed whitespace-pre-line">
            I just used an AI agent to send{' '}
            <span className="text-dark-text font-medium">{amount} {token}</span>{' '}
            to{' '}
            <span className="text-dark-text font-medium">{to}</span>{' '}
            on{' '}
            <span className="text-dark-text font-medium">{chainLabel}</span>.
            {'\n'}
            No wallet. No seed phrase. Gas:{' '}
            <span className="text-green-400 font-medium">$0.00</span>
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <a
            href={tweetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#1DA1F2] hover:bg-[#1a8cd8] rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Post
          </a>
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-dark-text bg-dark-hover border border-dark-border hover:border-dark-muted rounded-lg transition-colors"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-400">Copied</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
