'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProjectWithStatus } from '@/components/project/ProjectList'
import { DisplayProjectCard } from '@/components/project/DisplayProjectCard'

interface DisplayClientProps {
    initialProjects: ProjectWithStatus[]
}

export const DisplayClient = ({ initialProjects }: DisplayClientProps) => {
    const [projects] = useState<ProjectWithStatus[]>(initialProjects)
    const [searchTerm, setSearchTerm] = useState('')
    const [activeTab, setActiveTab] = useState('all')

    const filteredProjects = projects.filter((project) => {
        const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (project.class_id && project.class_id.toLowerCase().includes(searchTerm.toLowerCase()))
        
        const matchesTab = activeTab === 'all' ? true : project.location?.includes(activeTab)
        return matchesSearch && matchesTab
    })

    return (
        <div className="w-full container mx-auto px-4 py-8 space-y-8">
            <div className="flex flex-col gap-4">
                <h1 className="text-3xl font-bold tracking-tight">文化部展示</h1>
                <p className="text-muted-foreground">各文化部、委員会の展示企画一覧です。</p>
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
