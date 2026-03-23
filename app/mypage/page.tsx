'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/contexts/SessionContext'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database.types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { QRCodeDisplay } from '@/components/auth/QRCodeDisplay'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { LogOut, Ticket } from 'lucide-react'

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

    useEffect(() => {
        if (!sessionLoading && !session) {
            router.push('/login')
        }
    }, [session, sessionLoading, router])

    useEffect(() => {
        const fetchUserData = async () => {
            if (!session?.user) return
            // Fetch profile
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

        const fetchTickets = async () => {
            if (!session?.user) return

            const { data, error } = await supabase
                .from('fastpass_tickets')
                .select(`
                *,
                fastpass_slots (
                    *,
                    projects (*)
                )
            `)
                .eq('user_id', session.user.id)
                .eq('used', false)

            if (!error && data) {
                setTickets(data as FastPassTicket[])
            }
            setLoading(false)
        }

        if (session?.user) {
            fetchUserData()
            fetchTickets()
        }
    }, [session])

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
            // Error handling could be improved with toast
        } finally {
            setSaving(false)
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/')
    }

    if (sessionLoading || (session && loading)) return <div className="flex justify-center p-12"><LoadingSpinner /></div>
    if (!session) return null

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
                <CardContent>
                    {isEditing ? (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

                {tickets.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            まだ整理券を持っていません。<br />
                            企画ページから整理券を取得できます。
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {tickets.map(ticket => (
                            <Card key={ticket.ticket_id} className="overflow-hidden">
                                <CardHeader className="bg-primary/5 pb-3">
                                    <CardTitle className="text-lg">
                                        {ticket.fastpass_slots?.projects?.title || '不明な企画'}
                                    </CardTitle>
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
                                                {ticket.fastpass_slots?.start_time ? new Date(ticket.fastpass_slots.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                ~
                                                {ticket.fastpass_slots?.end_time ? new Date(ticket.fastpass_slots.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                            </p>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            この画面を運営スタッフに提示してください。
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}
