'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Megaphone, AlertCircle } from 'lucide-react'

export function NewsList() {
    const [news, setNews] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchNews = async () => {
            const { data } = await supabase
                .from('news' as any)
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(5)

            if (data) {
                setNews(data)
            }
            setLoading(false)
        }

        fetchNews()

        // Realtime subscription
        const channel = supabase
            .channel('public:news')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'news',
                    filter: 'is_active=eq.true'
                },
                (payload) => {
                    fetchNews() // Simple re-fetch strategy
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    if (loading) return <div className="flex justify-center py-4"><LoadingSpinner /></div>

    if (news.length === 0) {
        return <div className="text-center py-4 text-muted-foreground">現在お知らせはありません</div>
    }

    return (
        <div className="space-y-3">
            {news.map((item) => (
                <div
                    key={item.news_id}
                    className={`bg-white p-4 rounded-lg border shadow-sm ${item.is_important ? 'border-l-4 border-l-red-500 bg-red-50/50' : ''}`}
                >
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString()}
                        </span>
                        {item.is_important && (
                            <Badge variant="destructive" className="text-xs h-5 px-1.5 gap-0.5">
                                <AlertCircle className="w-3 h-3" /> 重要
                            </Badge>
                        )}
                    </div>
                    <p className={`text-sm md:text-base leading-relaxed whitespace-pre-wrap ${item.is_important ? 'font-medium text-foreground' : 'text-gray-700'}`}>
                        {item.content}
                    </p>
                </div>
            ))}
        </div>
    )
}
