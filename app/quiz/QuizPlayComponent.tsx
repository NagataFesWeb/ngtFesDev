'use client'

import { useState, useEffect, memo } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle, Trophy, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'

interface Question {
    q_id: number
    text: string
    choices: string[]
    explanation?: string
    correct_hash: string
}

function QuizPlayComponent({ onFinish }: { onFinish: () => void }) {
    const [loading, setLoading] = useState(true)
    const [questions, setQuestions] = useState<Question[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isGlitchActive, setIsGlitchActive] = useState(false)

    // State for current question
    const [selectedChoice, setSelectedChoice] = useState<number | null>(null)
    const [isAnswered, setIsAnswered] = useState(false)
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
    const [correctChoiceIndex, setCorrectChoiceIndex] = useState<number | null>(null)
    const [isWaiting, setIsWaiting] = useState(false)

    // Total score
    const [score, setScore] = useState(0)

    // Submit state
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [resultData, setResultData] = useState<{ score: number; total_score: number; highest_score: number; play_count: number } | null>(null)
    const [isFirstFullScore, setIsFirstFullScore] = useState(false)
    const [unlockedRewards, setUnlockedRewards] = useState<any[]>([])

    useEffect(() => {
        const initQuiz = async () => {
            try {
                // 1. Check Feature Toggle from cache
                const storedSettings = localStorage.getItem('quiz_enabled_cache')
                let isEnabled = true
                if (storedSettings) {
                    isEnabled = storedSettings === 'true'
                }

                if (!isEnabled) {
                    toast.error('クイズ機能は現在停止されています')
                    onFinish()
                    return
                }

                // 2. Fetch questions locally (or from RPC if cache is empty/expired)
                let allQuestions: Question[] = []
                const CACHE_KEY = 'quiz_questions_cache_v2'
                const cachedData = localStorage.getItem(CACHE_KEY)
                const CACHE_TTL = 60 * 60 * 1000 // 1 hour

                if (cachedData) {
                    try {
                        const parsed = JSON.parse(cachedData)
                        if (Date.now() - parsed.timestamp < CACHE_TTL) {
                            allQuestions = parsed.questions
                        }
                    } catch (e) {
                        console.error('Failed to parse cached questions', e)
                    }
                }

                if (allQuestions.length === 0) {
                    const { data, error } = await supabase.rpc('get_quiz_questions')
                    if (error) throw error

                    allQuestions = data as unknown as Question[]

                    if (!allQuestions || allQuestions.length === 0) {
                        throw new Error('問題が取得できませんでした')
                    }

                    localStorage.setItem(CACHE_KEY, JSON.stringify({
                        timestamp: Date.now(),
                        questions: allQuestions
                    }))

                    // Cache rewards only if not already cached and fresh
                    const rCache = localStorage.getItem('quiz_rewards_cache')
                    let needsRewardsFetch = true
                    if (rCache) {
                        const parsed = JSON.parse(rCache)
                        if (Date.now() - parsed.timestamp < 3600000) needsRewardsFetch = false
                    }

                    if (needsRewardsFetch) {
                        const { data: rewardData } = await supabase.from('quiz_rewards').select('*').order('required_score', { ascending: true })
                        if (rewardData) {
                            localStorage.setItem('quiz_rewards_cache', JSON.stringify({
                                timestamp: Date.now(),
                                rewards: rewardData
                            }))
                        }
                    }
                }

                // 2.5 Check for 100th play glitch (Current play count 99 means this will be 100th)
                const storedStatsStr = localStorage.getItem('quiz_user_stats')
                if (storedStatsStr) {
                    const stats = JSON.parse(storedStatsStr)
                    if (stats.play_count === 99) {
                        setIsGlitchActive(true)
                    }
                }

                // Shuffle and pick 10
                const shuffled = [...allQuestions].sort(() => 0.5 - Math.random())
                setQuestions(shuffled.slice(0, 10))
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : String(err))
                onFinish()
            } finally {
                setLoading(false)
            }
        }
        initQuiz()
    }, [onFinish])

    // Utility to wait for Web Crypto hash
    const hashAnswer = async (q_id: number, choiceIndex: number) => {
        if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
            console.error('Crypto API not available')
            return ''
        }
        const str = `${q_id}${choiceIndex}NgtFes26_Quiz_Salt`
        const msgUint8 = new TextEncoder().encode(str)
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
        return hashHex
    }

    // 音声エフェクトのプリロード
    useEffect(() => {
        const correctSound = new Audio('/Quiz_correctSound.mp3')
        correctSound.load()
        // window オブジェクトに保持してどこからでもアクセスできるようにするか、refを使う
        ;(window as any)._quizCorrectSound = correctSound
    }, [])

    // 祝福の紙吹雪を飛ばす共通関数
    const fireConfetti = () => {
        const duration = 5 * 1000
        const animationEnd = Date.now() + duration
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }
        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min

        const interval: any = setInterval(function() {
            const timeLeft = animationEnd - Date.now()
            if (timeLeft <= 0) return clearInterval(interval)
            const particleCount = 50 * (timeLeft / duration)
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }))
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }))
        }, 250)
    }

    const handleAnswer = async (index: number) => {
        if (isAnswered || isWaiting) return

        setIsAnswered(true)
        setSelectedChoice(index)

        const q = questions[currentIndex]

        let actualCorrectIdx = -1
        for (let i = 0; i < q.choices.length; i++) {
            const hash = await hashAnswer(q.q_id, i)
            if (hash === q.correct_hash) {
                actualCorrectIdx = i
                break
            }
        }

        setCorrectChoiceIndex(actualCorrectIdx)
        const correct = actualCorrectIdx === index
        setIsCorrect(correct)

        if (correct) {
            setScore(prev => prev + 1)
            // 正解音を再生
            const sound = (window as any)._quizCorrectSound
            if (sound) {
                sound.currentTime = 0
                sound.play().catch(e => console.warn('Audio play failed:', e))
            }
        }

        setIsWaiting(false)
    }

    const handleNextQuestion = () => {
        if (!isAnswered) return

        if (currentIndex < questions.length - 1) {
            setSelectedChoice(null)
            setCorrectChoiceIndex(null)
            setIsAnswered(false)
            setIsCorrect(null)
            setCurrentIndex(currentIndex + 1)
        } else {
            submitTotalScore(score)
        }
    }

    const submitTotalScore = async (finalScore: number) => {
        setIsSubmitting(true)
        try {
            // Queue the score locally
            const storedQueue = localStorage.getItem('quiz_sync_queue')
            const queue = storedQueue ? JSON.parse(storedQueue) : {
                score_delta: 0,
                highest_score: 0,
                play_count: 0
            }

            queue.score_delta += finalScore
            queue.highest_score = Math.max(queue.highest_score, finalScore)
            queue.play_count += 1

            localStorage.setItem('quiz_sync_queue', JSON.stringify(queue))

            // Update local user stats for optimistic UI
            const storedStatsStr = localStorage.getItem('quiz_user_stats')
            const currentStats = storedStatsStr ? JSON.parse(storedStatsStr) : {
                total_score: 0,
                highest_score: 0,
                play_count: 0
            }

            const newTotalScore = currentStats.total_score + finalScore
            const newHighestScore = Math.max(currentStats.highest_score, finalScore)
            const newPlayCount = currentStats.play_count + 1

            const newStats = {
                total_score: newTotalScore,
                highest_score: newHighestScore,
                play_count: newPlayCount,
                timestamp: Date.now()
            }

            const isFull = finalScore === 10 && currentStats.highest_score < 10
            setIsFirstFullScore(isFull)
            
            // 3. 称号開放の判定 (ローカルキャッシュを使用)
            const cachedRewardsStr = localStorage.getItem('quiz_rewards_cache')
            if (cachedRewardsStr) {
                const { rewards: allRewards } = JSON.parse(cachedRewardsStr)
                const newlyUnlocked = allRewards.filter((r: any) => 
                    currentStats.total_score < r.required_score && newTotalScore >= r.required_score
                )
                if (newlyUnlocked.length > 0) {
                    setUnlockedRewards(newlyUnlocked)
                    if (!isFull) fireConfetti()
                }
            }

            if (isFull) {
                fireConfetti()
            }

            localStorage.setItem('quiz_user_stats', JSON.stringify(newStats))

            setResultData({
                score: finalScore,
                total_score: newStats.total_score,
                highest_score: newStats.highest_score,
                play_count: newStats.play_count
            })
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : String(err))
        } finally {
            setIsSubmitting(false)
        }
    }

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    // Finished view
    if (resultData || (isSubmitting && currentIndex === questions.length - 1 && isAnswered)) {
        return (
            <div className="w-full max-w-md mx-auto">
                <Card className="w-full text-center shadow-xl border-primary/20">
                    <CardHeader>
                        <CardTitle className="text-2xl">スコア結果</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {isSubmitting || !resultData ? (
                            <div className="py-8 flex flex-col items-center">
                                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                                <p className="text-muted-foreground animate-pulse">スコアを記録中...</p>
                            </div>
                        ) : (
                            <>
                                <div className="p-6 bg-slate-100 dark:bg-slate-900 rounded-full w-32 h-32 mx-auto flex items-center justify-center border-4 border-primary">
                                    <span className="text-4xl font-black text-primary">{score}</span>
                                    <span className="text-xl text-muted-foreground">/10</span>
                                </div>
                                <div className="space-y-2 text-sm text-foreground bg-muted/50 p-4 rounded-lg">
                                    <p className="flex justify-between"><span>今回のスコア:</span> <strong className="text-lg">{resultData.score} 点</strong></p>
                                    <p className="flex justify-between"><span>累計正解数:</span> <strong>{resultData.total_score} 問</strong></p>
                                    <p className="flex justify-between"><span>これまでの最高記録:</span> <strong>{resultData.highest_score} 点</strong></p>
                                    <p className="flex justify-between"><span>プレイ回数:</span> <strong>{resultData.play_count} 回</strong></p>
                                </div>
                                {isFirstFullScore && (
                                    <div className="mt-4 p-4 bg-yellow-500/10 border-2 border-yellow-500 rounded-lg animate-bounce">
                                        <div className="flex items-center justify-center gap-2 text-yellow-600 dark:text-yellow-400 font-bold">
                                            <Trophy className="w-5 h-5" />
                                            <span>祝！初満点達成！</span>
                                            <Sparkles className="w-5 h-5" />
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1 text-center">素晴らしい知識です！おめでとうございます！</p>
                                    </div>
                                )}
                                {unlockedRewards.length > 0 && (
                                    <div className="mt-2 space-y-2">
                                        {unlockedRewards.map(reward => (
                                            <div key={reward.id} className="p-3 bg-primary/10 border border-primary/20 rounded-lg animate-in fade-in zoom-in duration-500">
                                                <p className="text-xs text-primary font-bold uppercase tracking-wider">New Title Unlocked!</p>
                                                <p className="text-sm font-black text-foreground">称号「{reward.title_name}」を獲得しました！</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                    {!isSubmitting && (
                        <CardFooter>
                            <Button className="w-full text-lg h-12 font-bold" onClick={onFinish}>
                                マイページ（称号）へ戻る
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            </div>
        )
    }

    // Active quiz view
    const q = questions[currentIndex]

    if (!q) {
        return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className={`w-full space-y-6 ${isGlitchActive ? 'glitch-active' : ''}`}>
            <div className="flex justify-between items-center text-sm font-medium text-muted-foreground">
                <span>問題 {currentIndex + 1} / {questions.length}</span>
                <span>現在のスコア: {score}</span>
            </div>

            <Card className="border-t-4 border-t-primary shadow-md">
                <CardHeader className="py-8">
                    <CardTitle className="text-xl leading-relaxed text-center">{q.text}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {q.choices.map((choice, idx) => {
                        const btnVariant: 'outline' | 'default' | 'destructive' | 'secondary' = 'outline'
                        let customClass = ''

                        if (isAnswered && correctChoiceIndex !== null) {
                            if (idx === correctChoiceIndex) {
                                customClass = 'bg-green-600 hover:bg-green-600 text-white border-green-600 disabled:opacity-100'
                            } else if (idx === selectedChoice) {
                                customClass = 'bg-slate-500 hover:bg-slate-500 text-white border-slate-500 disabled:opacity-100'
                            } else {
                                customClass = 'bg-muted hover:bg-muted text-muted-foreground border-muted disabled:opacity-100'
                            }
                        }

                        const variantType = customClass ? 'default' : btnVariant

                        return (
                            <Button
                                key={idx}
                                variant={variantType}
                                className={`w-full justify-start h-auto py-4 px-6 text-left whitespace-normal text-md transition-colors ${!isAnswered ? 'hover:border-primary' : ''} ${customClass}`}
                                onClick={() => handleAnswer(idx)}
                                disabled={isAnswered || isWaiting}
                            >
                                <span className="font-bold mr-4 text-muted-foreground">{['A', 'B', 'C', 'D'][idx]}</span>
                                {choice}
                                {isAnswered && idx === selectedChoice && (
                                    <span className="ml-auto">
                                        {isCorrect ? <CheckCircle2 className="w-5 h-5 text-white" /> : <XCircle className="w-5 h-5 text-white" />}
                                    </span>
                                )}
                            </Button>
                        )
                    })}

                    {isAnswered && q.explanation && (
                        <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-primary/10 animate-in fade-in slide-in-from-top-2 duration-500">
                            <h4 className="font-bold text-sm text-primary mb-2 flex items-center">
                                <span className="mr-2">💡</span> 解説
                            </h4>
                            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                                {q.explanation}
                            </p>
                        </div>
                    )}
                </CardContent>

                {isAnswered && (
                    <CardFooter className="pt-2 border-t bg-muted/20">
                        <Button
                            className="ml-auto font-bold px-8 h-12"
                            onClick={handleNextQuestion}
                        >
                            {currentIndex < questions.length - 1 ? '次の問題へ' : '結果を見る'}
                        </Button>
                    </CardFooter>
                )}
            </Card>

            <div className="text-center">
                <Button variant="ghost" className="text-muted-foreground" onClick={onFinish} disabled={isSubmitting}>
                    クイズを中断して戻る
                </Button>
            </div>
        </div>
    )
}

export default memo(QuizPlayComponent);
