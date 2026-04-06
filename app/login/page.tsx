'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
    const [loginId, setLoginId] = useState('')
    const [password, setPassword] = useState('')
    const [nickname, setNickname] = useState('')
    const [loading, setLoading] = useState(false)
    const [isSignUp, setIsSignUp] = useState(false)

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        // ダミーメールアドレスを組み立ててSupabase Authへ送る (SupabaseのEmailバリデーションを通過するため .com 等を使用)
        const dummyEmail = `${loginId}@dummy.ngtfes.com`

        try {
            if (isSignUp) {
                // ログインIDのバリデーション
                if (!/^[a-zA-Z0-9_]+$/.test(loginId)) {
                    throw new Error('ログインIDは半角英数字とアンダースコアのみ使用できます')
                }
                if (loginId.length < 3) {
                    throw new Error('ログインIDは3文字以上で入力してください')
                }
                if (password.length < 6) {
                    throw new Error('パスワードは6文字以上で入力してください')
                }

                const signUpNickname = nickname.trim() || 'Guest'

                const { error } = await supabase.auth.signUp({
                    email: dummyEmail,
                    password,
                    options: {
                        data: {
                            login_id: loginId,
                            full_name: signUpNickname
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
        } catch (err: Error | unknown) {
            const errorMessage = err instanceof Error ? err.message : 'An error occurred'
            toast.error(errorMessage)
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
                        {isSignUp
                            ? '希望するログインID・パスワード・ニックネームを入力してください。'
                            : '登録済みのログインIDでログインしてください'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAuth} className="space-y-4">
                        {isSignUp && (
                            <div className="space-y-1.5">
                                <Label htmlFor="nickname">ニックネーム</Label>
                                <Input
                                    id="nickname"
                                    type="text"
                                    placeholder="例: たろう"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    maxLength={20}
                                />
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    長田検定（クイズ）のランキングに表示されるユーザーネームとして使われます。1〜20文字。日本語・英数字・記号が使えます（空欄の場合「Guest」になります）。
                                </p>
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <Label htmlFor="loginId">
                                ログインID <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="loginId"
                                type="text"
                                placeholder="例: MyName123"
                                value={loginId}
                                onChange={(e) => setLoginId(e.target.value)}
                                required
                            />
                            {isSignUp && (
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    3文字以上。半角英字（大文字も可）、数字、アンダースコア（_）のみ。ログインIDは他の利用者には公開されず、登録後の変更はできません。
                                </p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="password">
                                パスワード <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            {isSignUp && (
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    6文字以上。半角英字・数字・記号が使えます。パスワードも他の利用者には公開されず、登録後の変更はできません。
                                </p>
                            )}
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
