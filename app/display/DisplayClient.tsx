'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProjectWithStatus } from '@/components/project/ProjectList'
import { DisplayProjectCard } from '@/components/project/DisplayProjectCard'
import { supabase } from '@/lib/supabase'

interface DisplayClientProps {
    initialProjects: ProjectWithStatus[]
}

const getDisplayFloor = (location: string | null): '2F' | '3F' | '4F' | null => {
    if (!location) return null

    if (location.includes('家庭準備室') || location.includes('作法室')) return '3F'

    const roomMatch = location.match(/(\d{3})/)
    if (!roomMatch) return null

    const floor = roomMatch[1].charAt(0)
    if (floor === '2') return '2F'
    if (floor === '3') return '3F'
    if (floor === '4') return '4F'

    return null
}

export const DisplayClient = ({ initialProjects }: DisplayClientProps) => {
    const [projects] = useState<ProjectWithStatus[]>(initialProjects)
    const [searchTerm, setSearchTerm] = useState('')
    const [activeTab, setActiveTab] = useState('all')
    const [mapUrl, setMapUrl] = useState<string | null>(null)
    const [mapLoading, setMapLoading] = useState(true)

    useEffect(() => {
        const fetchMap = async () => {
            setMapLoading(true)
            const { data } = supabase.storage.from('public-assets').getPublicUrl('venue-map-booth.webp')
            setMapUrl(data.publicUrl)
            setMapLoading(false)
        }
        fetchMap()
    }, [])

    const filteredProjects = projects.filter((project) => {
        const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (project.class_id && project.class_id.toLowerCase().includes(searchTerm.toLowerCase()))

        const projectFloor = getDisplayFloor(project.location)
        const matchesTab =
            activeTab === 'all'
                ? true
                : (activeTab === '20' && projectFloor === '2F') ||
                (activeTab === '30' && projectFloor === '3F') ||
                (activeTab === '40' && projectFloor === '4F')

        return matchesSearch && matchesTab
    })

    return (
        <div className="w-full container mx-auto px-4 py-8 space-y-8">
            <div className="flex flex-col gap-4">
                <h1 className="text-3xl font-bold tracking-tight">文化部展示</h1>
                <p className="text-muted-foreground">各文化部、委員会の展示企画一覧です。</p>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-semibold border-b pb-2">会場マップ</h2>
                <div className="w-full max-w-5xl mx-auto aspect-[2048/1143] bg-muted rounded-md border flex items-center justify-center overflow-hidden relative">
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
                    <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-full sm:w-auto">
                        <TabsList className="grid w-full grid-cols-4 sm:w-[500px]">
                            <TabsTrigger value="all">全て</TabsTrigger>
                            <TabsTrigger value="20">2F</TabsTrigger>
                            <TabsTrigger value="30">3F</TabsTrigger>
                            <TabsTrigger value="40">4F</TabsTrigger>
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
                            該当する企画が見つかりませんでした。
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
