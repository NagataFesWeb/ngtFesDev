'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy, RotateCcw, ListOrdered } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

type RankingItem = {
    display_name: string
    highest_score: number
}

function QuizResultContent() {
    const params = useSearchParams()
    const router = useRouter()

    const score = params.get('score') || '0'
    const correct = params.get('correct') || '0'
    const total = params.get('total') || '0'

    const [ranking, setRanking] = useState<RankingItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchRanking = async () => {
            const { data, error } = await supabase.rpc('get_quiz_ranking')
            if (!error && data) {
                setRanking(data as any)
            }
            setLoading(false)
        }
        fetchRanking()
    }, [])

    return (
        <div className="container py-12 flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] text-center space-y-8">
            <Card className="w-full max-w-md border-2 border-primary/20 shadow-xl">
                <CardHeader>
                    <CardTitle>結果発表</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                    <div className="flex flex-col items-center justify-center space-y-2">
                        <Trophy className="w-16 h-16 text-yellow-500 mb-2" />
                        <div className="text-5xl font-black text-primary">
                            {score} <span className="text-2xl font-normal text-muted-foreground">pt</span>
                        </div>
                        <p className="text-lg text-muted-foreground">
                            {total}問中 {correct}問正解！
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card className="w-full max-w-md">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center justify-center">
                        <ListOrdered className="mr-2 h-5 w-5" /> ランキング (Top 10)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-4"><LoadingSpinner /></div>
                    ) : ranking.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4">ランキングデータがありません</p>
                    ) : (
                        <ul className="space-y-2">
                            {ranking.map((item, index) => (
                                <li key={index} className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0">
                                    <span className={`font-bold w-6 text-left ${index < 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                                        #{index + 1}
                                    </span>
                                    <span className="flex-1 text-left truncate px-2">{item.display_name || 'No Name'}</span>
                                    <span className="font-mono font-semibold">{item.highest_score} pt</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>

            <div className="w-full max-w-md space-y-3">
                <Button className="w-full h-12" onClick={() => router.push('/quiz/play')}>
                    <RotateCcw className="mr-2 h-4 w-4" /> もう一度挑戦する
                </Button>
                <Button variant="outline" className="w-full h-12" onClick={() => router.push('/')}>
                    トップに戻る
                </Button>
            </div>
        </div>
    )
}

export default function QuizResultPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-3.5rem)]"><LoadingSpinner /></div>}>
            <QuizResultContent />
        </Suspense>
    )
}
