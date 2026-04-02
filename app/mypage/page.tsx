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
import { LogOut, Ticket, Trash2 } from 'lucide-react'
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

    useEffect(() => {
        const fetchUserData = async () => {
            if (!session?.user) return
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
            }
        }

        if (session?.user) {
            void fetchUserData()
            void fetchTickets()
        }
    }, [session, fetchTickets])

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
                                        <p className="text-xs text-muted-foreground">
                                            この画面を運営スタッフに提示してください。
                                        </p>
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
                                                {ticket.fastpass_slots?.festival_day && (
                                                    <Badge variant="secondary" className="mt-1">
                                                        {festivalDayLabel(ticket.fastpass_slots.festival_day)}
                                                    </Badge>
                                                )}
                                                <p className="text-xs text-muted-foreground mt-1">枠の終了時刻を過ぎたため使用できません。</p>
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
                    </div>
                )}
            </section>
        </div>
    )
}
