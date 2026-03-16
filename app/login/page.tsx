'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
    const [loginId, setLoginId] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [isSignUp, setIsSignUp] = useState(false)

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        // ダミーメールアドレスを組み立ててSupabase Authへ送る (SupabaseのEmailバリデーションを通過するため .com 等を使用)
        const dummyEmail = `${loginId}@dummy.ngtfes.com`

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email: dummyEmail,
                    password,
                    options: {
                        data: {
                            login_id: loginId
                        }
                    }
                })
                if (error) {
                    if (error.message.includes('User already registered') || error.message.includes('unique')) {
                        throw new Error('このログインIDは既に登録されています')
                    }
                    throw error
                }
                toast.success('アカウントを作成しました')
                router.push('/mypage')
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email: dummyEmail,
                    password,
                })
                if (error) {
                    if (error.message.includes('Invalid login credentials')) {
                        throw new Error('ログインIDまたはパスワードが間違っています')
                    }
                    throw error
                }
                toast.success('ログインしました')
                router.push('/mypage')
            }
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="container mx-auto px-4 flex items-center justify-center min-h-[calc(100vh-3.5rem)] py-12">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>{isSignUp ? 'アカウント登録' : 'ログイン'}</CardTitle>
                    <CardDescription>
                        {isSignUp ? '希望するログインIDとパスワードを入力してください' : '登録済みのログインIDでログインしてください'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAuth} className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                type="text"
                                placeholder="ログインID (例: myname123)"
                                value={loginId}
                                onChange={(e) => setLoginId(e.target.value)}
                                required
                            />
                            <Input
                                type="password"
                                placeholder="パスワード"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSignUp ? '登録' : 'ログイン'}
                        </Button>
                    </form>
                    <div className="mt-4 text-center">
                        <Button variant="link" onClick={() => setIsSignUp(!isSignUp)}>
                            {isSignUp ? 'すでにアカウントをお持ちの方はこちら' : '初めての方はこちら (アカウント登録)'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
