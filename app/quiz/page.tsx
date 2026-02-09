'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy, Play } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useSystemSettings } from '@/hooks/useSystemSettings'
import { AlertTriangle, Lock } from 'lucide-react'

import { useRouter } from 'next/navigation'
import { useSession } from '@/contexts/SessionContext'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function QuizTopPage() {
    const { settings: systemSettings, loading: settingsLoading } = useSystemSettings()
    const { session, loading: sessionLoading } = useSession()
    const router = useRouter()

    useEffect(() => {
        if (!sessionLoading && !session) {
            router.push('/login?redirect=/quiz')
        }
    }, [session, sessionLoading, router])

    if (sessionLoading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>
    if (!session) return null // Redirecting...

    return (
        <div className="container py-12 flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] text-center">
            <div className="mb-8 space-y-4">
                <div className="mx-auto w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Trophy className="w-10 h-10 text-yellow-600" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight">長田検定</h1>
                <p className="text-xl text-muted-foreground max-w-md mx-auto">
                    長田高校にまつわるクイズに挑戦しよう！<br />
                    あなたの長田愛が試される...
                </p>
            </div>

            <Card className="w-full max-w-md mb-8">
                <CardHeader>
                    <CardTitle className="flex items-center justify-center">
                        <Trophy className="mr-2 h-5 w-5 text-yellow-500" />
                        現在のランキング (Top 10)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <QuizRankingList />
                </CardContent>
            </Card>

            <Card className="w-full max-w-md mb-8">
                <CardHeader>
                    <CardTitle>ルール</CardTitle>
                </CardHeader>
                <CardContent className="text-left space-y-2">
                    <p>1. 全5問のクイズが出題されます。</p>
                    <p>2. 正解すると10ポイント獲得。</p>
                    <p>3. 何度でも挑戦できます。</p>
                    <p>4. ハイスコアはランキングに反映されます。</p>
                </CardContent>
            </Card>

            {systemSettings.quiz_enabled ? (
                <Link href="/quiz/play">
                    <Button size="lg" className="h-16 px-12 text-xl shadow-lg animate-pulse">
                        <Play className="mr-2 h-6 w-6" /> クイズを始める
                    </Button>
                </Link>
            ) : (
                <div className="flex flex-col items-center gap-2">
                    <Button size="lg" className="h-16 px-12 text-xl" disabled>
                        <Lock className="mr-2 h-6 w-6" /> 現在利用できません
                    </Button>
                    <p className="text-sm text-muted-foreground">管理者の設定により停止中です</p>
                </div>
            )}
        </div>
    )
}

const QuizRankingList = () => {
    const [ranking, setRanking] = useState<{ display_name: string, highest_score: number, total_score: number }[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchRanking = async () => {
            const { data } = await supabase.rpc('get_quiz_ranking')
            if (data) {
                setRanking(data as any)
            }
            setLoading(false)
        }
        fetchRanking()
    }, [])

    if (loading) return <div className="text-center py-4">読み込み中...</div>
    if (ranking.length === 0) return <div className="text-center py-4 text-muted-foreground">ランキングデータがありません</div>

    return (
        <ul className="space-y-2">
            <li className="flex justify-between text-xs text-muted-foreground border-b pb-1 px-2">
                <span className="w-8">順位</span>
                <span className="flex-1">名前</span>
                <span className="w-16 text-right">合計</span>
                <span className="w-16 text-right">最高</span>
            </li>
            {ranking.map((item, index) => (
                <li key={index} className="flex justify-between items-center text-sm border-b py-2 last:border-0">
                    <span className={`font-bold w-8 text-left ${index < 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                        #{index + 1}
                    </span>
                    <span className="flex-1 text-left truncate px-2">{item.display_name || 'No Name'}</span>
                    <span className="w-16 text-right font-mono font-bold text-primary">{item.total_score}pt</span>
                    <span className="w-16 text-right font-mono text-muted-foreground text-xs">{item.highest_score}pt</span>
                </li>
            ))}
        </ul>
    )
}
