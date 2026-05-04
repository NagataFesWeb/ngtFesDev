'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { DisplayProjectCard } from '@/components/project/DisplayProjectCard'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { ProjectWithStatus } from '@/components/project/ProjectList'

interface StageClientProps {
    initialProjects: ProjectWithStatus[]
}

export const StageClient = ({ initialProjects }: StageClientProps) => {
    const [projects] = useState<ProjectWithStatus[]>(initialProjects)

    const [searchTerm, setSearchTerm] = useState('')
    const [activeTab, setActiveTab] = useState('all')

    // Attempt to get the timetable image from Supabase Storage
    const [mapUrl, setMapUrl] = useState<string | null>(null)
    const [mapLoading, setMapLoading] = useState(true)

    useEffect(() => {
        const fetchMap = async () => {
            setMapLoading(true)
            const { data } = supabase.storage.from('public-assets').getPublicUrl('timetable-stage.webp')
            setMapUrl(data.publicUrl)
            setMapLoading(false)
        }
        fetchMap()
    }, [])

    const filteredProjects = projects.filter((project) => {
        const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (project.class_id && project.class_id.toLowerCase().includes(searchTerm.toLowerCase()))

        // Location will determine if it's 野外ステージ or 講堂ステージ
        const projLoc = project.location || ''
        const matchesTab = activeTab === 'all' ? true : projLoc.includes(activeTab)

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
                        <Image
                            src={mapUrl}
                            alt="タイムテーブル"
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
                        <span className="text-sm">タイムテーブル準備中</span>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-full sm:w-auto">
                        <TabsList className="grid w-full grid-cols-3 sm:w-[400px]">
                            <TabsTrigger value="all">全て</TabsTrigger>
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
                                <DisplayProjectCard
                                    key={project.project_id}
                                    project={project as unknown as React.ComponentProps<typeof DisplayProjectCard>['project']}
                                    hideClassId
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
