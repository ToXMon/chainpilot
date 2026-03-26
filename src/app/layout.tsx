import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ChainPilot - Web3 AI Agent',
  description: 'AI-powered blockchain intelligence agent. Check balances, gas prices, token info, and explore chains — all through chat.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-dark-bg text-dark-text antialiased">
        {children}
      </body>
    </html>
  )
}
