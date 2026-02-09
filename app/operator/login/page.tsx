'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useOperator } from '@/contexts/OperatorContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Lock } from 'lucide-react'

export default function OperatorLoginPage() {
    const router = useRouter()
    const { login } = useOperator()
    const [classId, setClassId] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { data, error } = await supabase.rpc('operator_login', {
                p_class_id: classId,
                p_password: password
            } as any)

            if (error) throw error

            const result = data as any
            if (result.status === 'success') {
                login(result.token, result.class_name, result.project_id)
                toast.success(`ようこそ、${result.class_name}のみなさん`)
                router.push('/operator/dashboard')
            } else {
                toast.error(result.message || 'ログインに失敗しました')
            }
        } catch (err: any) {
            toast.error('エラーが発生しました: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="container flex items-center justify-center min-h-[calc(100vh-3.5rem)] py-12 bg-slate-50 dark:bg-slate-900">
            <Card className="w-full max-w-sm shadow-lg">
                <CardHeader className="space-y-1">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Lock className="w-6 h-6 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl text-center">運営者ログイン</CardTitle>
                    <CardDescription className="text-center">
                        クラスIDとパスワードを入力してください
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                placeholder="クラスID (例: 1-1)"
                                value={classId}
                                onChange={(e) => setClassId(e.target.value)}
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
                            ログイン
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
