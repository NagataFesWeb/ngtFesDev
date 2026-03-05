'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
import { ArrowLeft, Ticket, Lock } from 'lucide-react'
import { useSystemSettings } from '@/hooks/useSystemSettings'
// import qrcode from 'qrcode.react' // Will add later

type Project = Database['public']['Tables']['projects']['Row']
type FastPassSlot = Database['public']['Tables']['fastpass_slots']['Row']

export default function ProjectDetailsPage() {
    const { id } = useParams()
    const router = useRouter()
    const { session, user } = useSession()
    const { settings: systemSettings, loading: settingsLoading } = useSystemSettings()

    const [project, setProject] = useState<Project | null>(null)
    const [congestionLevel, setCongestionLevel] = useState<number>(1)
    const [waitTime, setWaitTime] = useState<number>(0)
    const [slots, setSlots] = useState<FastPassSlot[]>([])

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isIssuing, setIsIssuing] = useState(false)
    const [isFastPassModalOpen, setIsFastPassModalOpen] = useState(false)

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            if (!id) return

            try {
                // Fetch Project
                const { data: projectData, error: projectError } = await supabase
                    .from('projects')
                    .select('*')
                    .eq('project_id', id as string)
                    .single()

                if (projectError) throw projectError
                setProject(projectData as any)

                // Fetch Congestion
                const { data: congestionData }: any = await supabase
                    .from('congestion')
                    .select('level')
                    .eq('project_id', id as string)
                    .single()

                if (congestionData) setCongestionLevel(congestionData.level)

                // Fetch Estimated Wait Time
                const { data: waitTimeData } = await supabase.rpc('get_estimated_wait_time', {
                    p_project_id: id as string
                })
                if (waitTimeData !== null) setWaitTime(waitTimeData)

                // Fetch Slots if enabled
                if ((projectData as any)?.fastpass_enabled) {
                    const { data: slotsData } = await supabase
                        .from('fastpass_slots')
                        .select('*')
                        .eq('project_id', id as string)
                        .order('start_time', { ascending: true })
                    setSlots(slotsData || [])
                }

            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchData()

        // Realtime subscription for congestion
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
                        setCongestionLevel((payload.new as any).level)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [id])

    // Actions

    const handleIssueFastPass = async (slotId: string) => {
        if (!session) {
            router.push('/login?redirect=/projects/' + id)
            return
        }

        setIsIssuing(true)
        try {
            const { data, error } = await supabase.rpc('issue_fastpass_ticket', {
                p_slot_id: slotId
            })

            if (error) throw error

            // Check custom error response if JSON
            if (data && typeof data === 'object' && 'code' in data) {
                // @ts-ignore
                if (data.status >= 400) throw new Error(data.code || 'Error')
            }

            toast.success('整理券を発券しました！マイページを確認してください。')
            setIsFastPassModalOpen(false)
        } catch (err: any) {
            let msg = err.message
            if (msg === 'ALREADY_HAS_TICKET') msg = 'すでに有効な整理券を持っています'
            if (msg === 'SLOT_FULL') msg = 'この枠は満席です'
            toast.error('発券できませんでした: ' + msg)
        } finally {
            setIsIssuing(false)
        }
    }

    if (loading) return <div className="flex justify-center p-12"><LoadingSpinner /></div>
    if (error || !project) return <div className="p-8"><ErrorMessage message={error || 'Project not found'} /></div>

    return (
        <div className="container py-8 max-w-3xl">
            <Button variant="ghost" className="mb-4 pl-0" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> 戻る
            </Button>

            <div className="space-y-6">
                {project.image_url && (
                    <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={project.image_url} alt={project.title} className="h-full w-full object-cover" />
                    </div>
                )}

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-base">{project.type}</Badge>
                        {/* <StatusIcon level={congestionLevel} showLabel className="scale-110" /> */}
                    </div>
                    <h1 className="text-3xl font-bold">{project.title}</h1>
                    <p className="text-muted-foreground mt-1">{project.class_id}</p>
                </div>

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

                <div className="prose max-w-none text-gray-700">
                    <p>{project.description}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    {systemSettings.fastpass_enabled && project.fastpass_enabled && (
                        <Dialog open={isFastPassModalOpen} onOpenChange={setIsFastPassModalOpen}>
                            <DialogTrigger asChild>
                                <Button variant="secondary" size="lg" className="w-full h-14 text-lg">
                                    <Ticket className="mr-2 h-5 w-5" /> 整理券を取得
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>時間枠を選択してください</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3 mt-4">
                                    {slots.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-4">現在配布中の整理券はありません。</p>
                                    ) : (
                                        slots.map(slot => (
                                            <Button
                                                key={slot.slot_id}
                                                variant="outline"
                                                className="w-full justify-between h-auto py-3"
                                                onClick={() => handleIssueFastPass(slot.slot_id)}
                                                disabled={isIssuing || (slot.capacity !== null && slot.capacity <= 0)} // Note: client logic needs real count if capacity is dynamic
                                            >
                                                <span>
                                                    {new Date(slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    -
                                                    {new Date(slot.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {/* Ideally show capacity count */}
                                            </Button>
                                        ))
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>
        </div>
    )
}
