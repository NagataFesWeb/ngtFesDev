'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Megaphone, Trash2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

type NewsItem = {
    news_id: string
    content: string
    is_important: boolean
    is_active: boolean
    created_at: string
}

export function NewsManager() {
    const [newsList, setNewsList] = useState<NewsItem[]>([])
    const [loading, setLoading] = useState(false)
    const [content, setContent] = useState('')
    const [isImportant, setIsImportant] = useState(false)

    const fetchNews = async () => {
        setLoading(true)
        // Cast to any to avoid type errors since 'news' table isn't in generated types yet
        const { data, error } = await (supabase.from('news' as any).select('*') as any).order('created_at', { ascending: false })

        if (error) {
            toast.error('お知らせの取得に失敗しました: ' + error.message)
        } else {
            setNewsList((data as NewsItem[]) || [])
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchNews()
    }, [])

    const handleCreate = async () => {
        if (!content.trim()) return

        const { error } = await supabase.from('news' as any).insert({
            content,
            is_important: isImportant,
            is_active: true
        })

        if (error) {
            toast.error('作成失敗: ' + error.message)
        } else {
            toast.success('お知らせを作成しました')
            setContent('')
            setIsImportant(false)
            fetchNews()
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('本当に削除しますか？')) return

        const { error } = await supabase.from('news' as any).delete().eq('news_id', id)

        if (error) {
            toast.error('削除失敗: ' + error.message)
        } else {
            toast.success('削除しました')
            fetchNews()
        }
    }

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase.from('news' as any).update({ is_active: !currentStatus }).eq('news_id', id)

        if (error) {
            toast.error('更新失敗: ' + error.message)
        } else {
            fetchNews()
        }
    }

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><Megaphone className="mr-2" /> お知らせ作成</CardTitle>
                    <CardDescription>新しいお知らせを投稿します。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>内容</Label>
                        <Textarea
                            placeholder="お知らせの内容を入力..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={4}
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch id="important" checked={isImportant} onCheckedChange={setIsImportant} />
                        <Label htmlFor="important" className="flex items-center cursor-pointer">
                            <AlertCircle className="w-4 h-4 mr-1 text-red-500" /> 重要なお知らせとしてマーク
                        </Label>
                    </div>
                    <Button onClick={handleCreate} disabled={!content.trim() || loading} className="w-full">
                        投稿する
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>お知らせ一覧</CardTitle>
                    <CardDescription>投稿済みのお知らせを管理します。</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4 max-h-[500px] overflow-auto pr-2">
                        {newsList.map((item) => (
                            <div key={item.news_id} className={`flex items-start justify-between p-4 rounded-lg border ${!item.is_active ? 'opacity-60 bg-muted' : 'bg-card'}`}>
                                <div className="space-y-1 flex-1 mr-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</span>
                                        {item.is_important && <Badge variant="destructive" className="text-xs">重要</Badge>}
                                        {!item.is_active && <Badge variant="secondary" className="text-xs">非公開</Badge>}
                                    </div>
                                    <p className="text-sm whitespace-pre-wrap">{item.content}</p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            checked={item.is_active}
                                            onCheckedChange={() => handleToggleActive(item.news_id, item.is_active)}
                                        />
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" onClick={() => handleDelete(item.news_id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {newsList.length === 0 && <div className="text-center text-muted-foreground py-8">お知らせはありません</div>}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
