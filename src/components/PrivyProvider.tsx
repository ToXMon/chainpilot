'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { privy } from '@/lib/privy'

export function PrivyProviderWrapper({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <PrivyProvider privy={privy}>
        {children}
      </PrivyProvider>
    </QueryClientProvider>
  )
}
