'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from 'sonner'
import { ShieldAlert } from 'lucide-react'

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const pathname = usePathname()
    const [isAdmin, setIsAdmin] = useState(false)
    const [loading, setLoading] = useState(true)

    const isLoginPage = pathname === '/admin/login'

    useEffect(() => {
        if (isLoginPage) {
            setLoading(false)
            return
        }

        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/admin/login')
                return
            }

            // Check role
            const { data, error } = await supabase
                .from('users')
                .select('role')
                .eq('user_id', user.id)
                .single()

            if (error || (data as any)?.role !== 'admin') {
                toast.error('管理者権限がありません')
                router.push('/')
                return
            }

            setIsAdmin(true)
            setLoading(false)
        }

        checkAdmin()
    }, [pathname, router, isLoginPage])

    // Simple logout
    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/admin/login')
    }

    if (loading) return <div className="h-screen flex items-center justify-center"><LoadingSpinner /></div>

    if (isLoginPage) return <>{children}</>

    if (!isAdmin) return null

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
            <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
                <div className="container mx-auto flex h-14 items-center justify-between px-4">
                    <div className="flex items-center gap-2 font-bold text-red-600">
                        <ShieldAlert className="h-5 w-5" />
                        管理者ダッシュボード
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleLogout}>
                        ログアウト
                    </Button>
                </div>
            </header>
            <main className="container mx-auto py-8 px-4">
                {children}
            </main>
        </div>
    )
}
