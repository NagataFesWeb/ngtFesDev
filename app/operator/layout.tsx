'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useOperator } from '@/contexts/OperatorContext'
import { Button } from '@/components/ui/button'

export default function OperatorLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { className, logout } = useOperator()
    const pathname = usePathname()
    const isLoginPage = pathname === '/operator/login'

    if (isLoginPage) {
        return <>{children}</>
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
                <div className="container flex h-14 items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/operator/dashboard" className="font-bold">
                            運営用ダッシュボード
                        </Link>
                        {className && (
                            <span className="text-sm px-2 py-1 bg-primary/10 text-primary rounded-md">
                                {className}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={logout}>
                            ログアウト
                        </Button>
                    </div>
                </div>
            </header>
            <main className="container py-8">
                {children}
            </main>
        </div>
    )
}
