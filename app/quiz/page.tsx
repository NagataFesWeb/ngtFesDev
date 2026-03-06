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
    const [rewards, setRewards] = useState<{
        id: number
        required_score: number
        title_name: string
        storage_path: string
    }[] | null>(null)
    const [isEnabled, setIsEnabled] = useState<boolean>(true)
    const [downloadingId, setDownloadingId] = useState<number | null>(null)

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

            // 2. Fetch Ranking & Rewards
            const [rankingRes, rewardsRes] = await Promise.all([
                (supabase.rpc('get_quiz_ranking') as unknown) as Promise<any>,
                (supabase.from('quiz_rewards').select('*').order('required_score', { ascending: true }) as unknown) as Promise<any>
            ])

            if (!rankingRes.error && rankingRes.data) {
                setRanking(rankingRes.data)
            }
            if (!rewardsRes.error && rewardsRes.data) {
                setRewards(rewardsRes.data)
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
        const defaultRank = { name: 'ビギナー', color: 'text-muted-foreground', icon: Star }

        if (!rewards || rewards.length === 0) {
            // フォールバック（初期表示用）
            if (score >= 100) return { name: 'マスター', color: 'text-yellow-500', icon: Trophy }
            if (score >= 60) return { name: 'ゴールド', color: 'text-amber-500', icon: Award }
            if (score >= 30) return { name: 'シルバー', color: 'text-slate-400', icon: Medal }
            if (score >= 10) return { name: 'ブロンズ', color: 'text-orange-700', icon: Star }
            return defaultRank
        }

        // 達成している最高報酬を探す (rewardsはrequired_score昇順)
        const achieved = [...rewards].reverse().find(r => score >= r.required_score)

        if (achieved) {
            let color = 'text-primary'
            let icon = Award
            if (achieved.title_name.includes('マスター')) { color = 'text-yellow-500'; icon = Trophy }
            else if (achieved.title_name.includes('ゴールド')) { color = 'text-amber-500'; icon = Award }
            else if (achieved.title_name.includes('シルバー')) { color = 'text-slate-400'; icon = Medal }
            else if (achieved.title_name.includes('ブロンズ')) { color = 'text-orange-700'; icon = Star }
            return { name: achieved.title_name, color, icon }
        }

        return defaultRank
    }

    const rank = getRank(total_score)
    const RankIcon = rank.icon

    const handleDownload = async (rewardId: number) => {
        try {
            setDownloadingId(rewardId)
            const { data, error } = await (supabase.rpc as any)('get_quiz_reward_url', { p_reward_id: rewardId })

            if (error || !data || (data as any[]).length === 0) {
                console.error('RPC Error or No Data:', error, data)
                throw new Error('未達成またはエラーが発生しました')
            }

            const { signed_url: path } = data[0] as any
            console.log('Attempting to download path:', path)

            // 2. Create Signed URL from Storage
            const { data: signData, error: signError } = await supabase.storage
                .from('quiz-rewards')
                .createSignedUrl(path, 3600)

            if (signError || !signData) throw signError

            // 3. Trigger Download
            const link = document.createElement('a')
            link.href = signData.signedUrl
            link.download = path.split('/').pop() || 'wallpaper.png'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        } catch (err: any) {
            alert(err.message || 'ダウンロードに失敗しました')
        } finally {
            setDownloadingId(null)
        }
    }

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

                    {/* 次の称号へのプログレス (動的) */}
                    {rewards && (
                        (() => {
                            const nextReward = rewards.find(r => total_score < r.required_score)
                            if (nextReward) {
                                return (
                                    <p className="text-xs text-muted-foreground">
                                        次の称号（{nextReward.title_name}）まであと <span className="font-bold text-foreground">{nextReward.required_score - total_score}</span> 問
                                    </p>
                                )
                            }
                            return <p className="text-xs text-yellow-500 font-bold">全ての称号を達成しました！</p>
                        })()
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

            {/* 報酬セクション */}
            {rewards && rewards.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                        <Award className="w-5 h-5 text-primary" />
                        <h2 className="text-xl font-bold">称号報酬（壁紙）</h2>
                    </div>
                    <div className="grid gap-3">
                        {rewards.map((reward) => {
                            const isUnlocked = total_score >= reward.required_score
                            const rewardRank = getRank(reward.required_score)
                            const RewardIcon = rewardRank.icon

                            return (
                                <Card key={reward.id} className={!isUnlocked ? "opacity-60 grayscale" : "border-primary/30"}>
                                    <CardContent className="flex items-center p-4">
                                        <div className={`mr-4 p-2 rounded-full bg-background shadow-sm ${rewardRank.color}`}>
                                            <RewardIcon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold">{reward.title_name} 壁紙</p>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                                                必要: {reward.required_score}問
                                            </p>
                                        </div>
                                        <div>
                                            {isUnlocked ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleDownload(reward.id)}
                                                    disabled={downloadingId === reward.id}
                                                >
                                                    {downloadingId === reward.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        'ダウンロード'
                                                    )}
                                                </Button>
                                            ) : (
                                                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                                                    未達成
                                                </span>
                                            )}
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
