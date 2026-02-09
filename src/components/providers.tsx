'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from '@/contexts/SessionContext'
import { OperatorProvider } from '@/contexts/OperatorContext'
import { Toaster } from '@/components/ui/sonner'

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient())

    return (
        <QueryClientProvider client={queryClient}>
            <SessionProvider>
                <OperatorProvider>
                    {children}
                    <Toaster />
                </OperatorProvider>
            </SessionProvider>
        </QueryClientProvider>
    )
}
