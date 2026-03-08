'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowRight, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

// Remove Node.js 'crypto' import for client-side Web Crypto API usage

interface Question {
    q_id: number
    text: string
    choices: string[]
    correct_hash: string
}

export default function QuizPlayPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [questions, setQuestions] = useState<Question[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)

    // State for current question
    const [selectedChoice, setSelectedChoice] = useState<number | null>(null)
    const [isAnswered, setIsAnswered] = useState(false)
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null)

    // Total score
    const [score, setScore] = useState(0)

    // Submit state
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [resultData, setResultData] = useState<any>(null)

    useEffect(() => {
        const initQuiz = async () => {
            try {
                // 1. Check Feature Toggle
                const { data: settings, error: settingsError } = await supabase
                    .from('system_settings')
                    .select('value')
                    .eq('key', 'quiz_enabled')
                    .single()

                const s = settings as any
                const isEnabled = !settingsError && settings && (s.value === true || s.value === 'true')

                if (!isEnabled) {
                    toast.error('クイズ機能は現在停止されています')
                    router.push('/quiz')
                    return
                }

                // 2. Must be logged in
                const { data: { session } } = await supabase.auth.getSession()
                if (!session) {
                    router.push('/login?redirect=/quiz')
                    return
                }

                // 3. Fetch 10 random questions from DB via RPC
                const { data, error } = await supabase.rpc('get_quiz_questions')
                if (error) throw error

                const questionsData = data as Question[]

                if (!questionsData || questionsData.length === 0) {
                    throw new Error('問題が取得できませんでした')
                }

                setQuestions(questionsData)
            } catch (err: any) {
                toast.error(err.message)
                router.push('/quiz')
            } finally {
                setLoading(false)
            }
        }
        initQuiz()
    }, [router])

    // Utility to wait for Web Crypto hash
    const hashAnswer = async (q_id: number, choiceIndex: number) => {
        if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
            console.error('Crypto API not available')
            return ''
        }
        // v_salt = 'NgtFes26_Quiz_Salt' matching the database RPC
        const str = `${q_id}${choiceIndex}NgtFes26_Quiz_Salt`
        const msgUint8 = new TextEncoder().encode(str)
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
        return hashHex
    }

    const handleAnswer = async (index: number) => {
        if (isAnswered) return

        setSelectedChoice(index)
        setIsAnswered(true)

        const q = questions[currentIndex]
        const hashedAttempt = await hashAnswer(q.q_id, index)

        const correct = hashedAttempt === q.correct_hash
        setIsCorrect(correct)

        if (correct) {
            setScore(prev => prev + 1)
        }
    }

    const nextQuestion = async () => {
        if (currentIndex < questions.length - 1) {
            setSelectedChoice(null)
            setIsAnswered(false)
            setIsCorrect(null)
            setCurrentIndex(prev => prev + 1)
        } else {
            // Finish Quiz
            await submitTotalScore()
        }
    }

    const submitTotalScore = async () => {
        setIsSubmitting(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) throw new Error('Session not found')

            const response = await fetch('/api/quiz/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ score })
            })

            const data = await response.json()
            if (!response.ok) {
                throw new Error(data.message || 'スコア登録に失敗しました')
            }

            setResultData(data)
        } catch (err: any) {
            toast.error(err.message)
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
            <div className="container flex items-center justify-center min-h-[calc(100vh-3.5rem)] py-12">
                <Card className="w-full max-w-md text-center shadow-xl border-primary/20">
                    <CardHeader>
                        <CardTitle className="text-2xl">スコア結果</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {isSubmitting ? (
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
                            </>
                        )}
                    </CardContent>
                    {!isSubmitting && (
                        <CardFooter>
                            <Button className="w-full text-lg h-12 font-bold" onClick={() => router.push('/quiz')}>
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

    // Guard: Prevent crash if questions are not yet loaded or empty during redirect
    if (!q) {
        return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="container max-w-2xl py-8 space-y-6">
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
                        let btnVariant: 'outline' | 'default' | 'destructive' | 'secondary' = 'outline'

                        if (isAnswered) {
                            if (idx === selectedChoice) {
                                btnVariant = isCorrect ? 'default' : 'destructive'
                            } else {
                                // Provide hint of correct answer? The DB doesn't give it back if wrong due to hashing.
                                // We can only evaluate the clicked one.
                                btnVariant = 'secondary'
                            }
                        }

                        return (
                            <Button
                                key={idx}
                                variant={btnVariant}
                                className={`w-full justify-start h-auto py-4 px-6 text-left whitespace-normal text-md ${isAnswered ? 'opacity-90' : 'hover:border-primary'}`}
                                onClick={() => handleAnswer(idx)}
                                disabled={isAnswered}
                            >
                                <span className="font-bold mr-4 text-muted-foreground">{['A', 'B', 'C', 'D'][idx]}</span>
                                {choice}
                                {isAnswered && idx === selectedChoice && (
                                    <span className="ml-auto">
                                        {isCorrect ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                                    </span>
                                )}
                            </Button>
                        )
                    })}
                </CardContent>
                <CardFooter className="bg-slate-50 dark:bg-slate-900/50 justify-end rounded-b-lg border-t pt-4">
                    <Button
                        onClick={nextQuestion}
                        disabled={!isAnswered}
                        size="lg"
                        className="font-bold"
                    >
                        {currentIndex < questions.length - 1 ? '次の問題へ' : '結果を見る'}
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
