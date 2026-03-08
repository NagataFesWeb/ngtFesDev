'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database.types'
import { ProjectCard } from '@/components/project/ProjectCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

type ProjectWithStatus = {
    project_id: string
    class_id: string
    type: string
    title: string
    description: string
    image_url: string
    fastpass_enabled: boolean
    congestion_level: number
    wait_time_min: number
}

interface ProjectListProps {
    initialProjects: ProjectWithStatus[]
}

export const ProjectList = ({ initialProjects }: ProjectListProps) => {
    const [projects] = useState<ProjectWithStatus[]>(initialProjects)
    const [congestionMap, setCongestionMap] = useState<Record<string, number>>({})

    // We can also track realtime wait times if we want, but calculation is complex on client.
    // For now, we update Congestion Level via realtime, but Wait Time remains "as of load" 
    // OR we can simple-calculate on client side if we have the formula.
    // Formula: (Queue + FP) * Rotation. We don't have Queue/FP/Rotation in the realtime payload.
    // So let's update Congestion Level (visual) realtime, but keep Wait Time static for MVP (or revalidate on router refresh).
    // Actually, ProjectCard takes waitTime as prop. We can try to derive it if possible, 
    // but without full config it's hard. Let's indicate "Latest" vs "Realtime".

    const [searchTerm, setSearchTerm] = useState('')
    const [activeTab, setActiveTab] = useState('all')

    // Initialize congestion map from initial data
    useEffect(() => {
        const map: Record<string, number> = {}
        initialProjects.forEach((p) => {
            map[p.project_id] = p.congestion_level
        })
        setCongestionMap(map)
    }, [initialProjects])

    // Realtime subscription
    useEffect(() => {
        const channel = supabase
            .channel('public:congestion')
            .on(
                'postgres_changes',
                {
                    event: '*', // INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'congestion',
                },
                (payload) => {
                    console.log('Congestion update:', payload)
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        const newRecord = payload.new as any
                        setCongestionMap(prev => ({ ...prev, [newRecord.project_id]: newRecord.level }))
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    // Filter logic
    const filteredProjects = projects.filter((project) => {
        const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (project.class_id && project.class_id.toLowerCase().includes(searchTerm.toLowerCase()))

        const matchesTab = activeTab === 'all' || project.type === activeTab

        return matchesSearch && matchesTab
    })

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">企画一覧</h1>
                    <p className="text-muted-foreground">全{projects.length}件の企画が開催中</p>
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="企画名・クラスで検索..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5 lg:w-[500px]">
                    <TabsTrigger value="all">すべて</TabsTrigger>
                    <TabsTrigger value="class">クラス</TabsTrigger>
                    <TabsTrigger value="food">食品</TabsTrigger>
                    <TabsTrigger value="stage">ステージ</TabsTrigger>
                    <TabsTrigger value="exhibition">展示</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-6">
                    {filteredProjects.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            企画が見つかりませんでした。
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredProjects.map((project) => (
                                <ProjectCard
                                    key={project.project_id}
                                    project={project as any}
                                    congestionLevel={congestionMap[project.project_id]}
                                    waitTime={project.wait_time_min}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
