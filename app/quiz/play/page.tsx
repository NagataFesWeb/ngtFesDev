'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database.types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from 'sonner' // Assuming sonner installed
import { ErrorMessage } from '@/components/ui/error-message';

// Fallback progress bar if shadcn's not installed
const ProgressBar = ({ value }: { value: number }) => (
    <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
        <div className="bg-primary h-2.5 rounded-full transition-all duration-300" style={{ width: `${value}%` }}></div>
    </div>
)

type Question = Database['public']['Tables']['quiz_questions']['Row']

export default function QuizPlayPage() {
    const router = useRouter()
    const [questions, setQuestions] = useState<Question[]>([])
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<number, number>>({}) // question_id -> choice_index
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchQuestions = async () => {
            const { data, error } = await supabase
                .from('quiz_questions')
                .select('*')
                .order('question_id') // Should randomize?
                .limit(10)

            if (error) {
                setError(error.message)
            } else if (data) {
                // Simple shuffle for display if needed, but keeping simple
                setQuestions(data)
            }
            setLoading(false)
        }
        fetchQuestions()
    }, [])

    const handleAnswer = (choiceIndex: number) => {
        const currentQ = questions[currentQuestionIndex]
        setAnswers(prev => ({ ...prev, [currentQ.question_id]: choiceIndex }))

        if (currentQuestionIndex < questions.length - 1) {
            // Next question delay for UX
            setTimeout(() => {
                setCurrentQuestionIndex(prev => prev + 1)
            }, 300)
        } else {
            // Finished
        }
    }

    const handleSubmit = async () => {
        setSubmitting(true)
        try {
            const { data, error } = await supabase.rpc('submit_quiz_score', {
                p_answers: answers
            } as any)

            if (error) throw error

            const result = data as any
            const score = result.score
            const correctCount = result.correct_count

            // Pass result via query params is simple (but insecure for score). 
            // Better to fetch result on next page or store in context. 
            // For simple MVP:
            router.push(`/quiz/result?score=${score}&correct=${correctCount}&total=${questions.length}`)

        } catch (err: any) {
            toast.error('送信エラー: ' + err.message)
            setSubmitting(false)
        }
    }

    if (loading) return <div className="flex justify-center p-12"><LoadingSpinner /></div>
    if (error) return <div className="p-12"><ErrorMessage message={error} /></div>
    if (questions.length === 0) return <div className="p-12 text-center text-muted-foreground">問題がありません。</div>

    const currentQ = questions[currentQuestionIndex]
    const progress = ((currentQuestionIndex) / questions.length) * 100
    const isLast = currentQuestionIndex === questions.length - 1
    const hasAnsweredCurrent = answers[currentQ.question_id] !== undefined
    const isCompleted = Object.keys(answers).length === questions.length

    return (
        <div className="container py-8 max-w-2xl min-h-[calc(100vh-3.5rem)] flex flex-col">
            <div className="mb-6 space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Question {currentQuestionIndex + 1} / {questions.length}</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <ProgressBar value={progress} />
            </div>

            <Card className="flex-1 flex flex-col">
                <CardHeader>
                    <CardTitle className="leading-relaxed text-xl">
                        {currentQ.question_text}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    <div className="grid gap-3">
                        {(currentQ.choices as string[]).map((choice, idx) => (
                            <Button
                                key={idx}
                                variant={answers[currentQ.question_id] === idx ? "default" : "outline"}
                                className="h-auto py-4 text-left justify-start text-base whitespace-normal"
                                onClick={() => handleAnswer(idx)}
                            >
                                {idx + 1}. {choice}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {isCompleted && isLast && (
                <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-4">
                    <Button size="lg" className="w-full text-lg h-14" onClick={handleSubmit} disabled={submitting}>
                        {submitting && <LoadingSpinner className="mr-2" />}
                        結果を見る
                    </Button>
                </div>
            )}
        </div>
    )
}
