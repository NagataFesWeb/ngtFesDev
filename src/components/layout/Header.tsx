'use client'

import Link from 'next/link'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useSession } from '@/contexts/SessionContext'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export const Header = () => {
    const { session } = useSession()
    const pathname = usePathname()

    const isOperator = pathname?.startsWith('/operator')
    const isAdmin = pathname?.startsWith('/admin')

    // Don't show public header on Operator/Admin pages if desired, or show a simplified one.
    // For now, we will show a consistent header but maybe different links.

    const NavLinks = () => (
        <>
            <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
                トップ
            </Link>
            <Link href="/projects" className="text-sm font-medium transition-colors hover:text-primary">
                企画一覧
            </Link>
            <Link href="/quiz" className="text-sm font-medium transition-colors hover:text-primary">
                長田検定
            </Link>
            <Link href="/mypage" className="text-sm font-medium transition-colors hover:text-primary">
                マイページ
            </Link>
        </>
    )

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4 flex h-14 items-center">
                <div className="mr-4 hidden md:flex">
                    <Link href="/" className="mr-6 flex items-center space-x-2">
                        <span className="hidden font-bold sm:inline-block">NgtFes26</span>
                    </Link>
                    <nav className="flex items-center space-x-6 text-sm font-medium">
                        <NavLinks />
                    </nav>
                </div>

                {/* Mobile Menu */}
                <div className="flex flex-1 items-center justify-between md:hidden">
                    <Link href="/" className="mr-2 flex items-center space-x-2">
                        <span className="font-bold">NgtFes26</span>
                    </Link>
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="md:hidden">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Toggle Menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right">
                            <div className="flex flex-col space-y-4 mt-4">
                                <NavLinks />
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>

                <div className="flex flex-1 items-center justify-end space-x-2">
                    <AuthButton />
                </div>
            </div>
        </header>
    )
}

const AuthButton = () => {
    const { session, loading } = useSession()
    const [nickname, setNickname] = useState<string | null>(null)

    useEffect(() => {
        if (!session?.user) {
            setNickname(null)
            return
        }

        const fetchProfile = async () => {
            const { data } = await supabase
                .from('users')
                .select('display_name')
                .eq('user_id', session.user.id)
                .single()

            if ((data as any)?.display_name) {
                setNickname((data as any).display_name)
            }
        }
        fetchProfile()
    }, [session])

    if (loading) return <Button variant="ghost" size="sm" disabled>...</Button>

    if (!session) {
        return (
            <Button asChild variant="default" size="sm">
                <Link href="/login">ログイン</Link>
            </Button>
        )
    }

    return (
        <Button asChild variant="outline" size="sm">
            <Link href="/mypage">
                {nickname || 'マイページ'}
            </Link>
        </Button>
    )
}
