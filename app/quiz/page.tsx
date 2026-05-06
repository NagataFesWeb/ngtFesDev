'use client'

import { useEffect, useState, memo, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Trophy, PlayCircle, Star, Award, Medal, Lock, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import QuizPlayComponent from './QuizPlayComponent'
import { useQuizTime, useQuizSyncStatus } from './QuizSyncProvider'

// 秒単位のカウントダウンのみを表示するコンポーネント
// 1秒ごとに更新される useQuizTime() をここで使うことで、再レンダリングをこのコンポーネントに封じ込める
const SyncTimerDisplay = memo(function SyncTimerDisplay() {
    const { timeLeft } = useQuizTime()
    const { isSyncing, lastSyncTime } = useQuizSyncStatus()

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60)
        const s = sec % 60
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    if (isSyncing) {
        return (
            <div className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                <span className="text-primary">同期中...</span>
            </div>
        )
    }

    return (
        <>
            <span>次回更新まで: {formatTime(timeLeft)}</span>
            {lastSyncTime > 0 && (
                <span className="text-[10px] opacity-70">
                    最終更新: {Math.floor((Date.now() - lastSyncTime) / 60000)}分前
                </span>
            )}
        </>
    )
})

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
    const [isPlaying, setIsPlaying] = useState(false)
    const [isFetchingRanking, setIsFetchingRanking] = useState(false)
    const [hasInitiallyFetched, setHasInitiallyFetched] = useState(false)

    // 10分に一度しか変わらない StatusContext のみを参照する
    // これにより、カウントダウン（timeLeft）による1秒おきの再レンダリングを回避する
    const { lastSyncTime } = useQuizSyncStatus()

    // 初回マウント時のみリロード判定を行う
    // performance API の結果はリロード後ずっと残るため、ここで一度だけ確定させる
    const isInitialReload = useMemo(() => {
        if (typeof window === 'undefined') return false
        const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
        return entries.length > 0 && entries[0].type === 'reload'
    }, [])

    // 0. 初期化：キャッシュから読み込んで表示
    useEffect(() => {
        const statsCache = localStorage.getItem('quiz_user_stats')
        if (statsCache) setStats(JSON.parse(statsCache))

        const rewardsCache = localStorage.getItem('quiz_rewards_cache')
        if (rewardsCache) {
            const parsed = JSON.parse(rewardsCache)
            setRewards(parsed.rewards || parsed)
        }

        const enabledCache = localStorage.getItem('quiz_enabled_cache_v2')
        if (enabledCache) {
            const { value } = JSON.parse(enabledCache)
            setIsEnabled(value)
        }

        const rankCache = localStorage.getItem('quiz_ranking_cache')
        if (rankCache) setRanking(JSON.parse(rankCache).data)

        if (statsCache) setLoading(false)
    }, [])

    useEffect(() => {
        const fetchData = async () => {
            if (isPlaying) return;

            const CACHE_TTL = 300000 // 5分
            const now = Date.now()

            // --- 徹底的なキャッシュガード ---
            const rankCacheStr = localStorage.getItem('quiz_ranking_cache')
            const statsCacheStr = localStorage.getItem('quiz_user_stats')
            const rewardsCacheStr = localStorage.getItem('quiz_rewards_cache')
            const enabledCacheStr = localStorage.getItem('quiz_enabled_cache_v2')

            let needsRanking = true
            let needsStats = true
            let needsRewards = true
            let needsEnabled = true

            // 強制取得すべきか判定：リロードかつ、このセッションでまだ一度も強制取得していない場合
            const shouldForceFetch = isInitialReload && !hasInitiallyFetched

            // 強制取得時以外はキャッシュを厳密にチェック
            if (!shouldForceFetch) {
                if (rankCacheStr) {
                    const { timestamp, data } = JSON.parse(rankCacheStr)
                    if (now - timestamp < CACHE_TTL) {
                        setRanking(data)
                        needsRanking = false
                    }
                }
                if (statsCacheStr) {
                    const s = JSON.parse(statsCacheStr)
                    if (!s.timestamp || now - s.timestamp < CACHE_TTL) {
                        setStats(s)
                        needsStats = false
                    }
                }
                if (rewardsCacheStr) {
                    const { timestamp } = JSON.parse(rewardsCacheStr)
                    if (now - timestamp < 3600000) {
                        needsRewards = false
                    }
                }
                if (enabledCacheStr) {
                    const { timestamp, value } = JSON.parse(enabledCacheStr)
                    if (now - timestamp < CACHE_TTL) {
                        setIsEnabled(value)
                        needsEnabled = false
                    }
                }
            }

            // 全部有効かつ強制取得の必要もないなら早期終了
            if (!shouldForceFetch && !needsRanking && !needsStats && !needsRewards && !needsEnabled) {
                setLoading(false)
                setHasInitiallyFetched(true)
                
                // キャッシュ有効時でもバックグラウンドでセッション確認（期限切れ対策）
                supabase.auth.getSession().then(({ data: { session } }) => {
                    if (!session) router.push('/login?redirect=/quiz')
                })
                return
            }

            setIsFetchingRanking(true)

            // ここで初めて auth を呼ぶ（必要な時だけ）
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login?redirect=/quiz')
                return
            }

            const promises: any[] = []
            const promiseKeys: string[] = []

            if (needsRanking) {
                promises.push(supabase.rpc('get_quiz_ranking'))
                promiseKeys.push('ranking')
            }
            if (needsStats) {
                promises.push(supabase.from('quiz_scores').select('total_score, highest_score, play_count').eq('user_id', session.user.id).maybeSingle())
                promiseKeys.push('stats')
            }
            if (needsRewards) {
                promises.push(supabase.from('quiz_rewards').select('*').order('required_score', { ascending: true }))
                promiseKeys.push('rewards')
            }
            if (needsEnabled) {
                promises.push(supabase.from('system_settings').select('value').eq('key', 'quiz_enabled').maybeSingle())
                promiseKeys.push('enabled')
            }

            if (promises.length > 0) {
                const results = await Promise.all(promises)
                results.forEach((res, idx) => {
                    const key = promiseKeys[idx]
                    if (res.error) return
                    if (key === 'ranking') {
                        setRanking(res.data)
                        localStorage.setItem('quiz_ranking_cache', JSON.stringify({ timestamp: now, data: res.data }))
                    } else if (key === 'stats') {
                        const dbStats = res.data || { total_score: 0, highest_score: 0, play_count: 0 }
                        const statsToSave = { ...dbStats, timestamp: now }
                        setStats(statsToSave)
                        localStorage.setItem('quiz_user_stats', JSON.stringify(statsToSave))
                    } else if (key === 'rewards') {
                        setRewards(res.data)
                        localStorage.setItem('quiz_rewards_cache', JSON.stringify({ timestamp: now, rewards: res.data }))
                    } else if (key === 'enabled') {
                        const val = (res.data?.value === true || res.data?.value === 'true')
                        setIsEnabled(val)
                        localStorage.setItem('quiz_enabled_cache_v2', JSON.stringify({ timestamp: now, value: val }))
                        localStorage.setItem('quiz_enabled_cache', String(val))
                    }
                })
            }

            setLoading(false)
            setIsFetchingRanking(false)
            setHasInitiallyFetched(true)
        }

        fetchData()
    }, [router, lastSyncTime, isPlaying])

    useEffect(() => {
        const handlePopState = () => {
            if (isPlaying) {
                setIsPlaying(false)
                const storedStatsStr = localStorage.getItem('quiz_user_stats')
                if (storedStatsStr) {
                    try {
                        setStats(JSON.parse(storedStatsStr))
                    } catch (e) { }
                }
            }
        }

        if (isPlaying) {
            window.history.pushState({ quiz: 'playing' }, '')
            window.addEventListener('popstate', handlePopState)
        }

        return () => {
            if (isPlaying) {
                window.removeEventListener('popstate', handlePopState)
            }
        }
    }, [isPlaying])

    const getRank = useMemo(() => (score: number) => {
        const defaultRank = { name: 'ビギナー', color: 'text-muted-foreground', icon: Star }

        if (!rewards || rewards.length === 0) {
            if (score >= 100) return { name: 'マスター', color: 'text-yellow-500', icon: Trophy }
            if (score >= 60) return { name: 'ゴールド', color: 'text-amber-500', icon: Award }
            if (score >= 30) return { name: 'シルバー', color: 'text-slate-400', icon: Medal }
            if (score >= 10) return { name: 'ブロンズ', color: 'text-orange-700', icon: Star }
            return defaultRank
        }

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
    }, [rewards])

    const currentStats = useMemo(() => stats || { total_score: 0, highest_score: 0, play_count: 0 }, [stats])
    const rank = useMemo(() => getRank(currentStats.total_score), [currentStats.total_score, getRank])
    const RankIcon = rank.icon

    const handleDownload = async (rewardId: number) => {
        try {
            setDownloadingId(rewardId)
            const { data, error } = await supabase.rpc('get_quiz_reward_url', { p_reward_id: rewardId })

            if (error || !data || (data as { signed_url: string }[]).length === 0) {
                throw new Error('未達成またはエラーが発生しました')
            }

            const { signed_url: path } = (data as { signed_url: string }[])[0]
            const { data: signData, error: signError } = await supabase.storage
                .from('quiz-rewards')
                .createSignedUrl(path, 3600)

            if (signError || !signData) throw signError

            const link = document.createElement('a')
            link.href = signData.signedUrl
            link.download = path.split('/').pop() || 'wallpaper.webp'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'ダウンロードに失敗しました')
        } finally {
            setDownloadingId(null)
        }
    }

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    if (isPlaying) {
        return (
            <div className="container mx-auto px-4 max-w-2xl py-8">
                <QuizPlayComponent onFinish={() => {
                    window.history.back()
                }} />
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 max-w-2xl py-8 space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight limelight text-primary">長田検定</h1>
                <p className="text-muted-foreground text-sm">長田高校に関するクイズに挑戦して、あなたの知識を深めましょう！</p>
            </div>

            <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="text-center pb-2">
                    <CardTitle className="text-xl">あなたの現在の称号</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center space-y-4">
                    <div className={`p-4 rounded-full bg-background shadow-md ${rank.color}`}>
                        <RankIcon className="w-16 h-16" />
                    </div>
                    <h2 className={`text-2xl sm:text-3xl font-black break-words leading-tight text-center max-w-full px-2 ${rank.color}`}>
                        {rank.name}
                    </h2>
                    <p className="text-sm font-medium">
                        累計正解数: <span className="text-xl mx-1 text-primary">{currentStats.total_score}</span> 問
                    </p>

                    {rewards && (
                        (() => {
                            // 未達成かつ 'hidden' を含まない次の報酬を探す
                            const nextPublicReward = rewards.find(r =>
                                currentStats.total_score < r.required_score &&
                                !r.title_name.toLowerCase().includes('hidden')
                            )

                            if (nextPublicReward) {
                                return (
                                    <p className="text-xs text-muted-foreground bg-white/50 px-3 py-1 rounded-full border border-primary/10">
                                        次の称号（{nextPublicReward.title_name}）まであと <span className="font-bold text-primary">{nextPublicReward.required_score - currentStats.total_score}</span> 問
                                    </p>
                                )
                            }

                            // 表向きの称号を全て達成している場合
                            return <p className="text-xs text-yellow-500 font-bold">全ての称号を達成しました！</p>
                        })()
                    )}
                </CardContent>
            </Card>

            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        <h2 className="text-xl font-bold">ランキング（上位3名）</h2>
                    </div>
                    <div className="text-xs font-medium text-muted-foreground flex flex-col items-end gap-1">
                        {isFetchingRanking ? (
                            <div className="flex items-center gap-1.5">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                                <span className="text-primary">更新中...</span>
                            </div>
                        ) : (
                            <SyncTimerDisplay />
                        )}
                    </div>
                </div>
                {ranking && ranking.length > 0 && (
                    <div className="grid gap-3">
                        {ranking.map((row, idx) => {
                            const userRank = getRank(row.total_score)
                            const UserRankIcon = userRank.icon

                            return (
                                <Card key={idx} className={idx === 0 ? "border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-900/10" : "bg-card/50"}>
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
                )}
            </div>

            {rewards && rewards.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                        <Award className="w-5 h-5 text-primary" />
                        <h2 className="text-xl font-bold">称号報酬</h2>
                    </div>
                    <div className="grid gap-3">
                        {rewards.map((reward, index) => {
                            const isUnlocked = currentStats.total_score >= reward.required_score
                            const isSecret = reward.title_name.toLowerCase().includes('hidden')
                            if (isSecret && !isUnlocked) return null

                            const isNextToUnlock = !isUnlocked && (index === 0 || currentStats.total_score >= rewards[index - 1].required_score)

                            const isSpecial = reward.id === 6
                            const rewardRank = getRank(reward.required_score)
                            const RewardIcon = rewardRank.icon

                            // 特殊なスタイリング（ID 6のみ）
                            const cardClass = !isUnlocked
                                ? "opacity-60 grayscale bg-muted/30"
                                : isSpecial
                                    ? "border-magenta-500 bg-magenta-50/30 dark:bg-magenta-900/20 shadow-[0_0_15px_rgba(255,0,255,0.2)] animate-pulse-slow"
                                    : "border-primary/30 bg-card"

                            return (
                                <Card key={reward.id} className={cardClass}>
                                    <CardContent className="flex items-center p-2 sm:p-4 gap-2 sm:gap-4">
                                        <div className={`flex-shrink-0 p-1.5 sm:p-2 rounded-full bg-background shadow-sm ${isSpecial && isUnlocked ? "text-magenta-500" : rewardRank.color}`}>
                                            <RewardIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-bold leading-tight break-words ${isSpecial && isUnlocked ? "text-magenta-600 dark:text-magenta-400 font-retro text-sm sm:text-lg tracking-tight" : "text-xs sm:text-base"}`}>
                                                {isUnlocked || isNextToUnlock ? reward.title_name : "？？？"}
                                            </p>
                                            <p className={`text-[8px] sm:text-[10px] text-muted-foreground uppercase tracking-widest ${isSpecial && isUnlocked ? "font-retro opacity-70" : ""}`}>
                                                必要: {reward.required_score}問
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            {isUnlocked ? (
                                                <Button
                                                    size="sm"
                                                    variant={isSpecial ? "default" : "outline"}
                                                    onClick={() => {
                                                        if (isSpecial) {
                                                            router.push('/quiz/system-override-992-delta-v7-private-2026')
                                                        } else {
                                                            handleDownload(reward.id)
                                                        }
                                                    }}
                                                    disabled={downloadingId === reward.id}
                                                    className={isSpecial
                                                        ? "bg-black hover:bg-zinc-900 text-white border-none shadow-[0_0_15px_rgba(255,0,255,0.4)] h-8 sm:h-10 px-3 sm:px-6 overflow-hidden relative"
                                                        : "border-primary text-primary hover:bg-primary hover:text-white h-7 sm:h-9 px-2 sm:px-4 text-[10px] sm:text-xs"
                                                    }
                                                >
                                                    {downloadingId === reward.id ? (
                                                        <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                                                    ) : (
                                                        isSpecial ? (
                                                            <span className="glitch-effect font-retro font-bold tracking-tighter text-xs sm:text-lg" data-text="ACCESS">
                                                                ACCESS
                                                            </span>
                                                        ) : (
                                                            <>
                                                                <span className="hidden sm:inline">ダウンロード</span>
                                                                <span className="sm:hidden">DL</span>
                                                            </>
                                                        )
                                                    )}
                                                </Button>
                                            ) : (
                                                <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
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
                <Card className="bg-card/50">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">最高スコア (1回)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">{currentStats.highest_score} <span className="text-sm text-muted-foreground font-normal">/ 10</span></div>
                    </CardContent>
                </Card>
                <Card className="bg-card/50">
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">プレイ回数</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">{currentStats.play_count} <span className="text-sm text-muted-foreground font-normal">回</span></div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col gap-4 mt-8 pt-4">
                <Button
                    size="lg"
                    className="w-full text-lg h-16 font-bold shadow-lg shadow-primary/20"
                    onClick={() => setIsPlaying(true)}
                    disabled={!isEnabled}
                >
                    {isEnabled ? (
                        <>
                            <PlayCircle className="w-6 h-6 mr-2" />
                            クイズに挑戦する (10問)
                        </>
                    ) : (
                        <>
                            <Lock className="w-6 h-6 mr-2" />
                            現在クイズは停止中です
                        </>
                    )}
                </Button>

                <p className="text-[10px] text-center text-muted-foreground leading-relaxed">
                    ※ 1回につきランダムに10問出題されます。<br />
                    ※ スコアはバックグラウンドで自動的に同期されます。
                </p>
            </div>
        </div>
    )
}
