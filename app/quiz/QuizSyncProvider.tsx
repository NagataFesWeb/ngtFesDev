'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

const SYNC_INTERVAL_SEC = 10 * 60 // 10 minutes

// 1. 頻繁に更新される「残り時間」用のContext
interface QuizTimeContextType {
    timeLeft: number
}
const QuizTimeContext = createContext<QuizTimeContextType>({
    timeLeft: SYNC_INTERVAL_SEC
})

// 2. たまにしか更新されない「同期状態」用のContext
interface QuizSyncStatusContextType {
    isSyncing: boolean
    hasQueue: boolean
    lastSyncTime: number
}
const QuizSyncStatusContext = createContext<QuizSyncStatusContextType>({
    isSyncing: false,
    hasQueue: false,
    lastSyncTime: 0
})

export const useQuizTime = () => useContext(QuizTimeContext)
export const useQuizSyncStatus = () => useContext(QuizSyncStatusContext)

export default function QuizSyncProvider({ children }: { children: ReactNode }) {
    const [timeLeft, setTimeLeft] = useState(SYNC_INTERVAL_SEC)
    const [hasQueue, setHasQueue] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const [lastSyncTime, setLastSyncTime] = useState(0)
    const isSyncingRef = useRef(false)

    useEffect(() => {
        isSyncingRef.current = isSyncing
    }, [isSyncing])

    useEffect(() => {
        const checkQueue = () => {
            const queueStr = localStorage.getItem('quiz_sync_queue')
            if (!queueStr) {
                setHasQueue(false)
                return false
            }
            try {
                const queue = JSON.parse(queueStr)
                const hasData = queue.play_count > 0 || queue.score_delta > 0
                setHasQueue(hasData)
                return hasData
            } catch {
                return false
            }
        }

        const syncQueue = async () => {
            if (isSyncingRef.current) return
            
            const hasData = checkQueue()
            
            if (hasData) {
                setIsSyncing(true)
                try {
                    const queueStr = localStorage.getItem('quiz_sync_queue')
                    if (queueStr) {
                        const queue = JSON.parse(queueStr)
                        const { data: { session } } = await supabase.auth.getSession()
                        if (session) {
                            const response = await fetch('/api/quiz/submit', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${session.access_token}`
                                },
                                body: JSON.stringify({
                                    score_delta: queue.score_delta,
                                    highest_score: queue.highest_score,
                                    play_count: queue.play_count
                                })
                            })

                            if (response.ok) {
                                localStorage.removeItem('quiz_sync_queue')
                                setHasQueue(false)
                            }
                        }
                    }
                } catch (err) {
                    console.error('Error in quiz sync:', err)
                } finally {
                    setIsSyncing(false)
                }
            }
            
            setLastSyncTime(Date.now())
            setTimeLeft(SYNC_INTERVAL_SEC)
        }

        checkQueue()

        const timerId = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    syncQueue()
                    return SYNC_INTERVAL_SEC
                }
                return prev - 1
            })
            checkQueue()
        }, 1000)

        const handleBeforeUnload = () => {
            syncQueue()
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        window.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                syncQueue()
            }
        })

        return () => {
            clearInterval(timerId)
            window.removeEventListener('beforeunload', handleBeforeUnload)
        }
    }, [])

    const syncStatusValue = useMemo(() => ({
        isSyncing,
        hasQueue,
        lastSyncTime
    }), [isSyncing, hasQueue, lastSyncTime])

    const timeValue = useMemo(() => ({
        timeLeft
    }), [timeLeft])

    return (
        <QuizSyncStatusContext.Provider value={syncStatusValue}>
            <QuizTimeContext.Provider value={timeValue}>
                {children}
            </QuizTimeContext.Provider>
        </QuizSyncStatusContext.Provider>
    )
}
