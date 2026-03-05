'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Trophy, PlayCircle, Star, Award, Medal, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function QuizDashboardPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<{
        total_score: number
        highest_score: number
        play_count: number
    } | null>(null)
    const [ranking, setRanking] = useState<{
        display_name: string
        total_score: number
        highest_score: number
        play_count: number
    }[] | null>(null)
    const [isEnabled, setIsEnabled] = useState<boolean>(true)

    useEffect(() => {
        const fetchData = async () => {
            // 1. Check Feature Toggle
            const { data: settings, error: settingsError } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'quiz_enabled')
                .single()

            if (!settingsError && settings) {
                const s = settings as any
                setIsEnabled(s.value === true || s.value === 'true')
            }

            // 2. Fetch Ranking (Parallel-ish)
            const { data: rankingData, error: rankingError } = await supabase.rpc('get_quiz_ranking')
            if (!rankingError && rankingData) {
                setRanking(rankingData as any)
            }

            // 3. Fetch Stats
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login?redirect=/quiz')
                return
            }

            const { data, error } = await supabase
                .from('quiz_scores')
                .select('total_score, highest_score, play_count')
                .eq('user_id', session.user.id)
                .single()

            if (!error && data) {
                setStats(data as any)
            } else {
                // Return 0s if no record exists yet
                setStats({ total_score: 0, highest_score: 0, play_count: 0 })
            }
            setLoading(false)
        }

        fetchData()
    }, [router])

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    if (!isEnabled) {
        return (
            <div className="container max-w-2xl py-12">
                <Card className="border-destructive/20 bg-destructive/5">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <AlertCircle className="h-12 w-12 text-destructive" />
                        </div>
                        <CardTitle className="text-2xl font-bold">現在この機能を利用できません</CardTitle>
                        <CardDescription className="text-lg">
                            長田検定は現在メンテナンス中か、公開期間外のためご利用いただけません。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center pb-8">
                        <Button variant="outline" onClick={() => router.push('/')}>
                            ホームへ戻る
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const { total_score = 0, highest_score = 0, play_count = 0 } = stats || {}

    // 称号判定ロジック
    const getRank = (score: number) => {
        if (score >= 100) return { name: 'マスター', color: 'text-yellow-500', icon: Trophy }
        if (score >= 60) return { name: 'ゴールド', color: 'text-amber-500', icon: Award }
        if (score >= 30) return { name: 'シルバー', color: 'text-slate-400', icon: Medal }
        if (score >= 10) return { name: 'ブロンズ', color: 'text-orange-700', icon: Star }
        return { name: 'ビギナー', color: 'text-muted-foreground', icon: Star }
    }

    const rank = getRank(total_score)
    const RankIcon = rank.icon

    return (
        <div className="container max-w-2xl py-8 space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">長田検定</h1>
                <p className="text-muted-foreground">長田高校に関するクイズに挑戦して、あなたの知識を深めましょう！</p>
            </div>

            <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="text-center pb-2">
                    <CardTitle className="text-xl">あなたの現在の称号</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center space-y-4">
                    <div className={`p-4 rounded-full bg-background shadow-md ${rank.color}`}>
                        <RankIcon className="w-16 h-16" />
                    </div>
                    <h2 className={`text-3xl font-black ${rank.color}`}>{rank.name}</h2>
                    <p className="text-sm font-medium">
                        累計正解数: <span className="text-xl mx-1">{total_score}</span> 問
                    </p>

                    {/* 次の称号へのプログレス (簡易) */}
                    {total_score < 100 && (
                        <p className="text-xs text-muted-foreground">
                            次の称号まであと {
                                total_score < 10 ? 10 - total_score :
                                    total_score < 30 ? 30 - total_score :
                                        total_score < 60 ? 60 - total_score :
                                            100 - total_score
                            } 問
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* ランキングセクション */}
            {ranking && ranking.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        <h2 className="text-xl font-bold">ランキング（上位3名）</h2>
                    </div>
                    <div className="grid gap-3">
                        {ranking.map((row, idx) => {
                            const userRank = getRank(row.total_score)
                            const UserRankIcon = userRank.icon

                            return (
                                <Card key={idx} className={idx === 0 ? "border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-900/10" : ""}>
                                    <CardContent className="flex items-center p-4">
                                        <div className="mr-3 flex items-center justify-center w-8 h-8 rounded-full font-black text-lg">
                                            {idx === 0 && <span className="text-yellow-500">1</span>}
                                            {idx === 1 && <span className="text-slate-400">2</span>}
                                            {idx === 2 && <span className="text-amber-600">3</span>}
                                        </div>
                                        <div className={`mr-3 p-2 rounded-full bg-background shadow-sm ${userRank.color}`}>
                                            <UserRankIcon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold leading-tight">{row.display_name}</p>
                                            <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                                <span>1回最高: <strong>{row.highest_score ?? 0}</strong></span>
                                                <span>挑戦: <strong>{row.play_count ?? 0}</strong>回</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xl font-black">{row.total_score ?? 0}</span>
                                            <span className="ml-1 text-xs text-muted-foreground font-bold">問</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground">最高スコア (1回)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{highest_score} / 10</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground">プレイ回数</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{play_count} 回</div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col gap-4 mt-8 pt-4">
                <Button
                    size="lg"
                    className="w-full text-lg h-16 font-bold"
                    onClick={() => router.push('/quiz/play')}
                >
                    <PlayCircle className="w-6 h-6 mr-2" />
                    クイズに挑戦する (全10問)
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                    ※ 1回につきランダムに10問出題されます。<br />
                    ※ スコアの登録は1分に1回のみ可能です。
                </p>
            </div>
        </div>
    )
}
