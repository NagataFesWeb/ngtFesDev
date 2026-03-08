'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Shield } from 'lucide-react'

export default function AdminLoginPage() {
    const router = useRouter()
    const [loginId, setLoginId] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        // 管理者用ダミーメールアドレスを組み立ててSupabase Authへ送る
        const dummyEmail = `${loginId}@dummy.ngtfes.com`

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: dummyEmail,
                password,
            })
            if (error) {
                if (error.message.includes('Invalid login credentials')) {
                    throw new Error('管理者IDまたはパスワードが間違っています')
                }
                throw error
            }

            // Role check happens in layout
            router.push('/admin/dashboard')
        } catch (err: any) {
            toast.error('ログイン失敗: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="container flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-950">
            <Card className="w-full max-w-sm shadow-xl border-red-100 dark:border-red-900/20">
                <CardHeader className="space-y-1">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                            <Shield className="w-6 h-6 text-red-600" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl text-center">管理者ログイン</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                type="text"
                                placeholder="管理者ID"
                                value={loginId}
                                onChange={(e) => setLoginId(e.target.value)}
                                required
                            />
                            <Input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" variant="destructive" className="w-full" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            ログイン
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
