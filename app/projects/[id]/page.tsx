'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database.types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorMessage } from '@/components/ui/error-message'
import { StatusIcon } from '@/components/common/StatusIcon'
import { useSession } from '@/contexts/SessionContext'
import { toast } from 'sonner'
import { ArrowLeft, Ticket } from 'lucide-react'
import { useSystemSettings } from '@/hooks/useSystemSettings'
import { useFastpassSalesStatus } from '@/hooks/useFastpassSalesStatus'
import { getProjectTypeBadgeClassName, getProjectTypeLabel, normalizeEscapedNewlines } from '@/lib/projectDisplay'
import {
    festivalDayLabel,
    isFastpassSlotIssuanceClosed,
    type FestivalDay,
} from '@/lib/fastpass'

type Project = Database['public']['Tables']['projects']['Row']
type FastPassSlot = Database['public']['Tables']['fastpass_slots']['Row']

function slotsForDay(slots: FastPassSlot[], day: FestivalDay) {
    return slots.filter((s) => s.festival_day === day).sort((a, b) => a.start_time.localeCompare(b.start_time))
}

export default function ProjectDetailsPage() {
    const { id } = useParams()
    const router = useRouter()
    const { session } = useSession()
    const { settings: systemSettings } = useSystemSettings()
    const { status: salesStatus, loading: salesLoading } = useFastpassSalesStatus()

    const [project, setProject] = useState<Project | null>(null)
    const [congestionLevel, setCongestionLevel] = useState<number>(1)
    const [waitTime, setWaitTime] = useState<number>(0)
    const [slots, setSlots] = useState<FastPassSlot[]>([])

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isIssuing, setIsIssuing] = useState(false)
    const [isFastPassModalOpen, setIsFastPassModalOpen] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return

            try {
                const { data: projectData, error: projectError } = await supabase
                    .from('projects')
                    .select('*')
                    .eq('project_id', id as string)
                    .single()

                if (projectError) throw projectError
                setProject(projectData as Project)

                const { data: congestionData } = await supabase
                    .from('congestion')
                    .select('level')
                    .eq('project_id', id as string)
                    .single()

                if (congestionData) setCongestionLevel((congestionData as { level: number }).level)

                const { data: waitTimeData } = await supabase.rpc('get_estimated_wait_time', {
                    p_project_id: id as string,
                })
                if (waitTimeData !== null) setWaitTime(waitTimeData)

                if ((projectData as Project)?.fastpass_enabled) {
                    const { data: slotsData } = await supabase
                        .from('fastpass_slots')
                        .select('*')
                        .eq('project_id', id as string)
                        .order('start_time', { ascending: true })
                    setSlots(slotsData || [])
                }
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : String(err))
            } finally {
                setLoading(false)
            }
        }

        fetchData()

        const channel = supabase
            .channel(`project:${id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'congestion',
                    filter: `project_id=eq.${id}`,
                },
                (payload) => {
                    if (payload.new) {
                        setCongestionLevel((payload.new as { level: number }).level)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [id])

    const bookableSlots = useMemo(() => {
        return slots.filter((s) => {
            const saleOk = s.festival_day === 'school' ? salesStatus.school_open : salesStatus.public_open
            if (!saleOk) return false
            if (isFastpassSlotIssuanceClosed(s.end_time)) return false
            return true
        })
    }, [slots, salesStatus])

    const dialogMessage = useMemo(() => {
        if (slots.length === 0) {
            return { kind: 'empty' as const, text: '現在配布中の整理券はありません。' }
        }
        const anySaleForProject = slots.some(
            (s) => (s.festival_day === 'school' && salesStatus.school_open) || (s.festival_day === 'public' && salesStatus.public_open)
        )
        if (!anySaleForProject) {
            return {
                kind: 'presale' as const,
                text: 'ファストパス販売開始前です。開始後にこちらから時間枠を選んで取得できます。',
            }
        }
        if (bookableSlots.length === 0) {
            return {
                kind: 'expired' as const,
                text: '現在、予約可能な時間枠はありません（すべて終了しているか、枠が設定されていません）。',
            }
        }
        return null
    }, [slots, salesStatus, bookableSlots.length])

    const handleIssueFastPass = async (slotId: string) => {
        if (!session) {
            router.push('/login?redirect=/projects/' + id)
            return
        }

        setIsIssuing(true)
        try {
            const { data, error } = await supabase.rpc('issue_fastpass_ticket', {
                p_slot_id: slotId,
            })

            if (error) throw error

            if (data && typeof data === 'object' && 'status' in data) {
                const d = data as { status: string | number; code?: string }
                if (typeof d.status === 'number' && d.status >= 400) {
                    throw new Error(d.code || 'Error')
                }
            }

            toast.success('整理券を発券しました！マイページを確認してください。')
            setIsFastPassModalOpen(false)
        } catch (err: unknown) {
            let msg = err instanceof Error ? err.message : String(err)
            if (msg === 'ALREADY_HAS_TICKET') msg = 'すでに同一祭日で有効な整理券を持っています'
            if (msg === 'SLOT_FULL') msg = 'この枠は満席です'
            if (msg === 'SLOT_EXPIRED') msg = 'この時間枠は発券できません（枠の終了時刻を過ぎています）'
            if (msg === 'SALES_NOT_STARTED') msg = 'この祭日のファストパス販売はまだ開始されていません'
            toast.error('発券できませんでした: ' + msg)
        } finally {
            setIsIssuing(false)
        }
    }

    if (loading) return <div className="flex justify-center p-12"><LoadingSpinner /></div>
    if (error || !project) return <div className="p-8"><ErrorMessage message={error || 'Project not found'} /></div>

    const normalizedSchedule = normalizeEscapedNewlines(project.schedule) ?? ''
    const normalizedDescription = normalizeEscapedNewlines(project.description) ?? ''

    const schoolBookable = slotsForDay(bookableSlots, 'school')
    const publicBookable = slotsForDay(bookableSlots, 'public')

    return (
        <div className="container mx-auto px-4 md:px-6 py-8 max-w-3xl">
            <Button variant="ghost" className="mb-4 pl-0" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> 戻る
            </Button>

            <div className="space-y-6">
                {project.image_url ? (
                    <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted relative">
                        <Image src={project.image_url} alt={project.title} fill className="object-cover" />
                    </div>
                ) : (
                    <div className="aspect-video w-full rounded-lg bg-muted border flex items-center justify-center text-muted-foreground flex-col gap-2">
                        <span className="text-lg font-medium">Coming Soon...</span>
                    </div>
                )}

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <Badge
                            variant="outline"
                            className={`text-sm font-medium px-3 py-1 ${getProjectTypeBadgeClassName(project.type, project.location)}`}
                        >
                            {getProjectTypeLabel(project.type, project.location)}
                        </Badge>
                    </div>
                    <h1 className="text-3xl font-bold mb-1">{project.title}</h1>
                    <div className="flex flex-col gap-1.5 mt-3 text-sm font-medium">
                        {project.type !== 'stage' && project.type !== 'exhibition' && project.class_id && (
                            <p className="text-muted-foreground">{project.class_id}</p>
                        )}
                        {project.location && (
                            <div className="flex items-center gap-2">
                                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold">場所</span>
                                <span className="text-foreground">{project.location}</span>
                            </div>
                        )}
                        {project.schedule && (
                            <div className="flex items-center gap-2">
                                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold">出演時間</span>
                                <span className="text-foreground whitespace-pre-wrap">{normalizedSchedule}</span>
                            </div>
                        )}
                    </div>
                </div>

                {project.type !== 'stage' && project.type !== 'exhibition' && (
                    <Card>
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-muted-foreground">現在の混雑状況</span>
                                <StatusIcon level={congestionLevel} showLabel className="mt-1" />
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <span className="text-sm font-medium text-muted-foreground">推定待ち時間</span>
                                <div className="flex items-center mt-1">
                                    <span className="text-2xl font-bold">{waitTime}</span>
                                    <span className="text-sm ml-1">分</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="prose max-w-none text-gray-700">
                    <p className="whitespace-pre-wrap">{normalizedDescription}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {systemSettings.fastpass_enabled && project.fastpass_enabled && (
                        <Dialog open={isFastPassModalOpen} onOpenChange={setIsFastPassModalOpen}>
                            <DialogTrigger asChild>
                                <Button variant="secondary" size="lg" className="w-full h-14 text-lg">
                                    <Ticket className="mr-2 h-5 w-5" /> 整理券を取得
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[85vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>時間枠を選択してください</DialogTitle>
                                </DialogHeader>
                                {salesLoading ? (
                                    <div className="flex justify-center py-8"><LoadingSpinner /></div>
                                ) : dialogMessage ? (
                                    <div className="space-y-3 mt-4">
                                        <p className="text-sm text-muted-foreground leading-relaxed">{dialogMessage.text}</p>
                                        {dialogMessage.kind === 'presale' && (
                                            <p className="text-xs text-muted-foreground">
                                                模擬店一覧などでは「FP対象」と表示されている店舗がファストパス対象です。
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-6 mt-4">
                                        {schoolBookable.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-sm font-semibold text-foreground">{festivalDayLabel('school')}</p>
                                                <div className="space-y-2">
                                                    {schoolBookable.map((slot) => (
                                                        <Button
                                                            key={slot.slot_id}
                                                            variant="outline"
                                                            className="w-full justify-between h-auto py-3"
                                                            onClick={() => handleIssueFastPass(slot.slot_id)}
                                                            disabled={isIssuing || (slot.capacity !== null && slot.capacity <= 0)}
                                                        >
                                                            <span>
                                                                {new Date(slot.start_time).toLocaleString('ja-JP', {
                                                                    month: 'numeric',
                                                                    day: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                })}
                                                                {' '}
                                                                -
                                                                {new Date(slot.end_time).toLocaleTimeString('ja-JP', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                })}
                                                            </span>
                                                            <Badge variant="secondary" className="shrink-0">校内祭</Badge>
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {publicBookable.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-sm font-semibold text-foreground">{festivalDayLabel('public')}</p>
                                                <div className="space-y-2">
                                                    {publicBookable.map((slot) => (
                                                        <Button
                                                            key={slot.slot_id}
                                                            variant="outline"
                                                            className="w-full justify-between h-auto py-3"
                                                            onClick={() => handleIssueFastPass(slot.slot_id)}
                                                            disabled={isIssuing || (slot.capacity !== null && slot.capacity <= 0)}
                                                        >
                                                            <span>
                                                                {new Date(slot.start_time).toLocaleString('ja-JP', {
                                                                    month: 'numeric',
                                                                    day: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                })}
                                                                {' '}
                                                                -
                                                                {new Date(slot.end_time).toLocaleTimeString('ja-JP', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                })}
                                                            </span>
                                                            <Badge variant="secondary" className="shrink-0">一般祭</Badge>
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>
        </div>
    )
}
