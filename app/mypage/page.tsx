'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/contexts/SessionContext'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { QRCodeDisplay } from '@/components/auth/QRCodeDisplay'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { LogOut, Ticket, Trash2, Award, PlayCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { festivalDayLabel, isFastpassTicketStillValid } from '@/lib/fastpass'

type FastPassTicket = Database['public']['Tables']['fastpass_tickets']['Row'] & {
    fastpass_slots: Database['public']['Tables']['fastpass_slots']['Row'] & {
        projects: Database['public']['Tables']['projects']['Row'] | null
    } | null
}

export default function MyPage() {
    const { session, loading: sessionLoading } = useSession()
    const router = useRouter()
    const [displayName, setDisplayName] = useState('')
    const [loginId, setLoginId] = useState('')
    const [isEditing, setIsEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [tickets, setTickets] = useState<FastPassTicket[]>([])
    const [loading, setLoading] = useState(true)
    const [discardingId, setDiscardingId] = useState<string | null>(null)
    const [cancelingId, setCancelingId] = useState<string | null>(null)
    const [quizRank, setQuizRank] = useState<{
        rank: number | null, total_users: number, total_score: number, highest_score: number, play_count: number
    } | null>(null)

    useEffect(() => {
        if (!sessionLoading && !session) {
            router.push('/login')
        }
    }, [session, sessionLoading, router])

    const userId = session?.user?.id

    const fetchTickets = useCallback(async () => {
        if (!userId) return
        const { data, error } = await supabase
            .from('fastpass_tickets')
            .select(`
                *,
                fastpass_slots (
                    *,
                    projects (*)
                )
            `)
            .eq('user_id', userId)
            .eq('used', false)

        if (!error && data) {
            setTickets(data as FastPassTicket[])
        }
        setLoading(false)
    }, [userId])

    const fetchQuizRank = useCallback(async (currentName?: string | null) => {
        if (!userId) return
        
        const { data: myScore } = await supabase.from('quiz_scores').select('*').eq('user_id', userId).single()
        
        if (!myScore) {
            setQuizRank(null)
            return
        }

        let myRank = null;
        if (currentName) {
            const { data: top3 } = await supabase.rpc('get_quiz_ranking')
            if (top3) {
                 // 名前の重複による誤表示を防ぐため、スコアとプレイ回数も完全に一致するか確認します
                 const index = top3.findIndex((t) => 
                    t.display_name === currentName &&
                    t.total_score === myScore.total_score &&
                    t.highest_score === myScore.highest_score &&
                    t.play_count === myScore.play_count
                 );
                 if (index !== -1) {
                     myRank = index + 1;
                 }
            }
        }
        
        setQuizRank({
            rank: myRank,
            total_users: 0, 
            total_score: myScore.total_score ?? 0,
            highest_score: myScore.highest_score ?? 0,
            play_count: myScore.play_count ?? 0
        })
    }, [userId])

    useEffect(() => {
        const fetchUserData = async () => {
            if (!session?.user) return null
            const { data: userData } = await supabase
                .from('users')
                .select('display_name, login_id')
                .eq('user_id', session.user.id)
                .single()

            if (userData) {
                if ('display_name' in userData) {
                    setDisplayName((userData.display_name as string) || '')
                }
                if ('login_id' in userData) {
                    setLoginId((userData.login_id as string) || '')
                }
                return userData.display_name as string
            }
            return null
        }

        if (session?.user) {
            fetchUserData().then((name) => {
                void fetchQuizRank(name)
            })
            void fetchTickets()
        }
    }, [session, fetchTickets, fetchQuizRank])

    const handleUpdateProfile = async () => {
        if (!session?.user) return
        setSaving(true)
        try {
            const { error } = await supabase
                .from('users')
                .update({ display_name: displayName })
                .eq('user_id', session.user.id)

            if (error) throw error
            setIsEditing(false)
        } catch (err) {
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    const handleDiscardExpired = async (ticketId: string) => {
        setDiscardingId(ticketId)
        try {
            const { data, error } = await supabase.rpc('discard_expired_fastpass_ticket', {
                p_ticket_id: ticketId,
            })
            if (error) throw error
            const row = data as { status?: string | number; code?: string }
            if (row?.code === 'CANNOT_DISCARD' || (typeof row?.status === 'number' && row.status >= 400)) {
                throw new Error(row.code || 'CANNOT_DISCARD')
            }
            toast.success('失効した整理券を削除しました')
            await fetchTickets()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : '削除できませんでした')
        } finally {
            setDiscardingId(null)
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/')
    }

    if (sessionLoading || (session && loading)) return <div className="flex justify-center p-12"><LoadingSpinner /></div>
    if (!session) return null

    const validTickets = tickets.filter(
        (t) => t.fastpass_slots?.end_time && isFastpassTicketStillValid(t.fastpass_slots.end_time)
    )
    const expiredTickets = tickets.filter(
        (t) => t.fastpass_slots?.end_time && !isFastpassTicketStillValid(t.fastpass_slots.end_time)
    )

    const handleCancelTicket = async (ticketId: string) => {
        if (!window.confirm('こちらの整理券をキャンセル（返却）します。よろしいですか？\n※キャンセルを取り消すことはできません。')) return;


        setCancelingId(ticketId)
        try {
            // @ts-expect-error: New RPC, defined in migration, waiting for type generation
            const { data, error } = await supabase.rpc('cancel_fastpass_ticket', {
                p_ticket_id: ticketId,
            })
            if (error) throw error
            const row = data as { status?: string | number; code?: string }
            if (row?.code === 'CANNOT_CANCEL' || (typeof row?.status === 'number' && row.status >= 400)) {
                throw new Error(row.code || 'CANNOT_CANCEL')
            }
            toast.success('整理券をキャンセルしました')
            await fetchTickets()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'キャンセルできませんでした')
        } finally {
            setCancelingId(null)
        }
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold">マイページ</h1>
                    <p className="text-muted-foreground">{loginId || session.user.email || 'ゲストユーザー'}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" /> ログアウト
                </Button>
            </div>

            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                        <span>プロフィール設定</span>
                        {!isEditing && (
                            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                                編集
                            </Button>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        ニックネームは長田検定（クイズ）のランキングに表示される名前として使われます。
                    </p>
                    {isEditing ? (
                        <div className="flex gap-2 flex-wrap">
                            <input
                                type="text"
                                className="flex h-10 min-w-[200px] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="ニックネーム"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                maxLength={20}
                            />
                            <Button onClick={handleUpdateProfile} disabled={saving}>
                                {saving ? '保存中...' : '保存'}
                            </Button>
                            <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={saving}>
                                キャンセル
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="font-medium">ニックネーム:</span>
                            <span>{displayName || '未設定'}</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            <section className="space-y-4 mb-8">
                <h2 className="text-xl font-semibold flex items-center">
                    <Award className="mr-2 h-5 w-5 text-yellow-500" />
                    長田検定 成績・ランキング
                </h2>
                
                <Card>
                    <CardContent className="p-6">
                        {quizRank ? (
                            <div className="grid gap-6 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground font-medium">現在の順位</p>
                                    <div className="flex items-baseline gap-2">
                                        {quizRank.rank !== null ? (
                                            <>
                                                <span className="text-3xl font-bold text-primary">{quizRank.rank}</span>
                                                <span className="text-muted-foreground">位 （TOP 3入り！）</span>
                                            </>
                                        ) : (
                                            <span className="text-muted-foreground pt-1">圏外（TOP 3のみ順位表示）</span>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 sm:grid-cols-1 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">累計スコア</p>
                                        <p className="text-xl font-semibold">{quizRank.total_score}</p>
                                    </div>
                                    <div className="flex justify-between sm:justify-start gap-8">
                                        <div>
                                            <p className="text-sm text-muted-foreground">最高スコア</p>
                                            <p className="text-lg font-medium">{quizRank.highest_score}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">プレイ回数</p>
                                            <p className="text-lg font-medium">{quizRank.play_count} 回</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="sm:col-span-2 pt-4 border-t">
                                    <Button asChild className="w-full sm:w-auto" variant="outline">
                                        <Link href="/quiz" prefetch={false}>
                                            <PlayCircle className="mr-2 h-4 w-4" /> 長田検定をプレイする
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <p className="text-muted-foreground mb-4">まだ長田検定を受けていません</p>
                                <Button asChild>
                                    <Link href="/quiz" prefetch={false}>
                                        <PlayCircle className="mr-2 h-4 w-4" /> 長田検定に挑戦する
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center">
                    <Ticket className="mr-2 h-5 w-5 text-primary" />
                    取得済み整理券
                </h2>

                {validTickets.length === 0 && expiredTickets.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            まだ整理券を持っていません。<br />
                            企画ページから整理券を取得できます。
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {validTickets.map((ticket) => (
                            <Card key={ticket.ticket_id} className="overflow-hidden">
                                <CardHeader className="bg-primary/5 pb-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <CardTitle className="text-lg">
                                            {ticket.fastpass_slots?.projects?.title || '不明な企画'}
                                        </CardTitle>
                                        {ticket.fastpass_slots?.festival_day && (
                                            <Badge variant="outline">
                                                {festivalDayLabel(ticket.fastpass_slots.festival_day)}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {ticket.fastpass_slots?.projects?.class_id}
                                    </p>
                                </CardHeader>
                                <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-6">
                                    <div className="flex-shrink-0">
                                        <QRCodeDisplay value={ticket.qr_token} size={100} />
                                    </div>
                                    <div className="space-y-2 text-center sm:text-left">
                                        <div>
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">TIME</span>
                                            <p className="text-2xl font-mono font-bold">
                                                {ticket.fastpass_slots?.start_time
                                                    ? new Date(ticket.fastpass_slots.start_time).toLocaleString('ja-JP', {
                                                        month: 'numeric',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })
                                                    : '--:--'}
                                                ~
                                                {ticket.fastpass_slots?.end_time
                                                    ? new Date(ticket.fastpass_slots.end_time).toLocaleTimeString('ja-JP', {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })
                                                    : '--:--'}
                                            </p>
                                        </div>
                                        <p className="text-xs text-muted-foreground mb-4">
                                            この画面を運営スタッフに提示してください。
                                        </p>
                                        {ticket.fastpass_slots?.start_time && new Date() <= new Date(ticket.fastpass_slots.start_time) && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full text-foreground/70"
                                                disabled={cancelingId === ticket.ticket_id}
                                                onClick={() => handleCancelTicket(ticket.ticket_id)}
                                            >
                                                {cancelingId === ticket.ticket_id ? <LoadingSpinner className="mr-2" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                                キャンセルする
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {expiredTickets.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium text-muted-foreground">失効した整理券（削除して整理できます）</h3>
                                {expiredTickets.map((ticket) => (
                                    <Card key={ticket.ticket_id} className="border-dashed opacity-90">
                                        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                            <div>
                                                <p className="font-medium">{ticket.fastpass_slots?.projects?.title || '不明な企画'}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {ticket.fastpass_slots?.festival_day && (
                                                        <Badge variant="secondary">
                                                            {festivalDayLabel(ticket.fastpass_slots.festival_day)}
                                                        </Badge>
                                                    )}
                                                    <span className="text-xs text-muted-foreground font-mono">
                                                        {ticket.fastpass_slots?.start_time
                                                            ? new Date(ticket.fastpass_slots.start_time).toLocaleString('ja-JP', {
                                                                month: 'numeric',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            })
                                                            : '--:--'}
                                                        ~
                                                        {ticket.fastpass_slots?.end_time
                                                            ? new Date(ticket.fastpass_slots.end_time).toLocaleTimeString('ja-JP', {
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            })
                                                            : '--:--'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1 text-destructive">枠の終了時刻を過ぎたため使用できません。</p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="shrink-0"
                                                disabled={discardingId === ticket.ticket_id}
                                                onClick={() => handleDiscardExpired(ticket.ticket_id)}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                {discardingId === ticket.ticket_id ? '削除中...' : '一覧から削除'}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div >
                )}
            </section >
        </div >
    )
}
