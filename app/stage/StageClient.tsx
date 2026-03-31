'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ProjectCard } from '@/components/project/ProjectCard'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { ProjectWithStatus } from '@/components/project/ProjectList'

interface StageClientProps {
    initialProjects: ProjectWithStatus[]
}

export const StageClient = ({ initialProjects }: StageClientProps) => {
    const [projects] = useState<ProjectWithStatus[]>(initialProjects)
    const [congestionMap, setCongestionMap] = useState<Record<string, number>>(() => {
        const map: Record<string, number> = {}
        initialProjects.forEach((p) => {
            map[p.project_id] = p.congestion_level
        })
        return map
    })

    const [searchTerm, setSearchTerm] = useState('')
    const [activeTab, setActiveTab] = useState('野外ステージ')
    
    // Attempt to get the timetable image from Supabase Storage
    const [mapUrl, setMapUrl] = useState<string | null>(null)
    const [mapLoading, setMapLoading] = useState(true)

    useEffect(() => {
        const fetchMap = async () => {
            setMapLoading(true)
            const { data } = supabase.storage.from('public-assets').getPublicUrl('timetable-stage.png')
            setMapUrl(data.publicUrl)
            setMapLoading(false)
        }
        fetchMap()
    }, [])

    useEffect(() => {
        const channel = supabase
            .channel('public:congestion')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'congestion',
                },
                (payload) => {
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        const newRecord = payload.new as { project_id: string; level: number }
                        setCongestionMap(prev => ({ ...prev, [newRecord.project_id]: newRecord.level }))
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const filteredProjects = projects.filter((project) => {
        const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (project.class_id && project.class_id.toLowerCase().includes(searchTerm.toLowerCase()))
        
        // Location will determine if it's 野外ステージ or 講堂ステージ
        // If location is not strictly set yet, we might fallback.
        const projLoc = project.location || ''
        const matchesTab = projLoc.includes(activeTab)

        return matchesSearch && matchesTab
    })

    return (
        <div className="w-full container mx-auto px-4 py-8 space-y-8">
            <div className="flex flex-col gap-4">
                <h1 className="text-3xl font-bold tracking-tight">ステージ</h1>
                <p className="text-muted-foreground">野外ステージ・講堂ステージのタイムテーブルと企画一覧です。</p>
            </div>
            
            <div className="space-y-4">
                <h2 className="text-xl font-semibold border-b pb-2">タイムテーブル</h2>
                <div className="w-full aspect-video bg-muted rounded-md border flex items-center justify-center overflow-hidden relative">
                    {!mapLoading && mapUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img 
                            src={mapUrl} 
                            alt="タイムテーブル" 
                            className="w-full h-full object-contain"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                    ) : null}
                    <div className={mapUrl ? "hidden absolute inset-0 flex items-center justify-center text-muted-foreground flex-col gap-2" : "absolute inset-0 flex items-center justify-center text-muted-foreground flex-col gap-2"}>
                        <span className="text-lg font-medium">Coming Soon...</span>
                        <span className="text-sm">タイムテーブル準備中</span>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <Tabs defaultValue="野外ステージ" onValueChange={setActiveTab} className="w-full sm:w-auto">
                        <TabsList className="grid w-full grid-cols-2 sm:w-[300px]">
                            <TabsTrigger value="野外ステージ">野外ステージ</TabsTrigger>
                            <TabsTrigger value="講堂ステージ">講堂ステージ</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="企画名で検索..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="mt-6">
                    {filteredProjects.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground border rounded-lg bg-card/50">
                            指定したステージの企画が見つかりませんでした。
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredProjects.map((project) => (
                                <ProjectCard
                                    key={project.project_id}
                                    project={project as unknown as React.ComponentProps<typeof ProjectCard>['project']}
                                    congestionLevel={congestionMap[project.project_id]}
                                    waitTime={project.wait_time_min}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
