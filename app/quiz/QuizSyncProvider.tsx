'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

const SYNC_INTERVAL_SEC = 10 * 60 // 10 minutes

interface QuizSyncContextType {
    timeLeft: number
    isSyncing: boolean
    hasQueue: boolean
    lastSyncTime: number
}

const QuizSyncContext = createContext<QuizSyncContextType>({
    timeLeft: SYNC_INTERVAL_SEC,
    isSyncing: false,
    hasQueue: false,
    lastSyncTime: 0
})

export const useQuizSync = () => useContext(QuizSyncContext)

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
            
            // Queue確認 (なくてもランキング更新のためにlastSyncTimeは更新する)
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
                            } else {
                                console.error('Failed to sync quiz queue:', await response.text())
                            }
                        }
                    }
                } catch (err) {
                    console.error('Error in quiz sync:', err)
                } finally {
                    setIsSyncing(false)
                }
            }
            
            // データの有無に関わらず、10分間隔でランキングを再取得させるシグナルを送る
            setLastSyncTime(Date.now())
            setTimeLeft(SYNC_INTERVAL_SEC)
        }

        checkQueue()

        // 1-second countdown loop
        const timerId = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    syncQueue()
                    return SYNC_INTERVAL_SEC // syncQueue will also set it, but this is safe
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

    return (
        <QuizSyncContext.Provider value={{ timeLeft, isSyncing, hasQueue, lastSyncTime }}>
            {children}
        </QuizSyncContext.Provider>
    )
}
