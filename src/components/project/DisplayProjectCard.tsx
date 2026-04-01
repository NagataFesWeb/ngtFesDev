'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Clock } from 'lucide-react'
import { Database } from '@/types/database.types'

type Project = Database['public']['Tables']['projects']['Row']

interface DisplayProjectCardProps {
    project: Project
    hideClassId?: boolean
}

export const DisplayProjectCard = ({ project, hideClassId = false }: DisplayProjectCardProps) => {
    const getTypeLabel = (type: string | null, location: string | null) => {
        if (type === 'stage') {
            if (location?.includes('講堂')) return '講堂ステージ'
            if (location?.includes('野外')) return '野外ステージ'
            return 'ステージ'
        }
        switch (type) {
            case 'food': return '食品模擬'
            case 'class': return '教室模擬'
            case 'exhibition': return '展示'
            default: return 'その他'
        }
    }

    return (
        <Link href={`/projects/${project.project_id}`}>
            <Card className="h-full overflow-hidden transition-all hover:shadow-lg hover:border-primary/50 flex flex-col bg-white py-0">
                {project.image_url && (
                    <div className="aspect-[4/3] w-full overflow-hidden bg-muted relative">
                        <Image src={project.image_url} alt={project.title} fill className="object-cover transition-transform hover:scale-105" />
                    </div>
                )}
                <CardHeader className="px-7 py-5 pb-2">
                    <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary" className="bg-muted text-muted-foreground border-none">
                            {getTypeLabel(project.type, project.location)}
                        </Badge>
                    </div>
                    <CardTitle className="line-clamp-1 text-lg font-bold">{project.title}</CardTitle>
                    {!hideClassId && <p className="text-sm font-medium text-muted-foreground">{project.class_id}</p>}
                </CardHeader>
                <CardContent className="px-7 py-5 pt-0 flex-1 flex flex-col">
                    {(project.location || project.schedule) && (
                        <div className="text-sm font-medium flex flex-col gap-1.5 mb-3">
                            {project.location && (
                                <div className="flex items-start gap-1.5 align-middle">
                                    <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                                    <span>{project.location}</span>
                                </div>
                            )}
                            {project.schedule && (
                                <div className="flex items-start gap-1.5 align-middle">
                                    <Clock className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                                    <span className="whitespace-pre-wrap leading-tight text-xs">{project.schedule}</span>
                                </div>
                            )}
                        </div>
                    )}
                    <p className="line-clamp-3 text-sm text-gray-500 mt-auto leading-relaxed">
                        {project.description || '説明文がありません'}
                    </p>
                </CardContent>
            </Card>
        </Link>
    )
}
