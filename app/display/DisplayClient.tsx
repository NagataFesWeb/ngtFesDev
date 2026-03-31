'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { ProjectCard } from '@/components/project/ProjectCard'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { ProjectWithStatus } from '@/components/project/ProjectList'

interface DisplayClientProps {
    initialProjects: ProjectWithStatus[]
}

export const DisplayClient = ({ initialProjects }: DisplayClientProps) => {
    const [projects] = useState<ProjectWithStatus[]>(initialProjects)
    const [congestionMap, setCongestionMap] = useState<Record<string, number>>(() => {
        const map: Record<string, number> = {}
        initialProjects.forEach((p) => {
            map[p.project_id] = p.congestion_level
        })
        return map
    })

    const [searchTerm, setSearchTerm] = useState('')
    
    // Attempt to get the venue map image from Supabase Storage
    const [mapUrl, setMapUrl] = useState<string | null>(null)
    const [mapLoading, setMapLoading] = useState(true)

    useEffect(() => {
        const fetchMap = async () => {
            setMapLoading(true)
            const { data } = supabase.storage.from('public-assets').getPublicUrl('venue-map-display.png')
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
        return project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (project.class_id && project.class_id.toLowerCase().includes(searchTerm.toLowerCase()))
    })

    return (
        <div className="w-full container mx-auto px-4 py-8 space-y-8">
            <div className="flex flex-col gap-4">
                <h1 className="text-3xl font-bold tracking-tight">展示</h1>
                <p className="text-muted-foreground">文化部・有志による展示企画一覧です。</p>
            </div>
            
            <div className="space-y-4">
                <h2 className="text-xl font-semibold border-b pb-2">会場マップ</h2>
                <div className="w-full aspect-video bg-muted rounded-md border flex items-center justify-center overflow-hidden relative">
                    {!mapLoading && mapUrl ? (
                        <Image 
                            src={mapUrl} 
                            alt="会場マップ" 
                            fill
                            className="object-contain"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement?.querySelector('.fallback-content')?.classList.remove('hidden');
                            }}
                        />
                    ) : null}
                    <div className={mapUrl ? "hidden absolute inset-0 flex items-center justify-center text-muted-foreground flex-col gap-2 fallback-content" : "absolute inset-0 flex items-center justify-center text-muted-foreground flex-col gap-2 fallback-content"}>
                        <span className="text-lg font-medium">Coming Soon...</span>
                        <span className="text-sm">マップ準備中</span>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="relative w-full sm:w-64 ml-auto">
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

                <div className="mt-6">
                    {filteredProjects.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground border rounded-lg bg-card/50">
                            企画が見つかりませんでした。
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
