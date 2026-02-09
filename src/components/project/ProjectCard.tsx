'use client'

import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusIcon } from '@/components/common/StatusIcon'
import { Database } from '@/types/database.types'

type Project = Database['public']['Tables']['projects']['Row']

interface ProjectCardProps {
    project: Project
    congestionLevel?: number
    waitTime?: number // New prop
}

export const ProjectCard = ({ project, congestionLevel = 1, waitTime }: ProjectCardProps) => {
    const getTypeLabel = (type: string | null) => {
        switch (type) {
            case 'food': return '食品'
            case 'class': return 'クラス'
            case 'stage': return 'ステージ'
            case 'exhibition': return '展示'
            default: return 'その他'
        }
    }

    return (
        <Link href={`/projects/${project.project_id}`}>
            <Card className="h-full overflow-hidden transition-all hover:shadow-md hover:border-primary/50 flex flex-col">
                {project.image_url && (
                    <div className="aspect-[4/3] w-full overflow-hidden bg-muted relative">
                        {/* Changed aspect-video to aspect-[4/3] for better poster visibility. 
                            Using object-contain with a background or object-cover?
                            '見切れている' usually means important content is lost.
                            Let's try object-contain with a neutral background, or just cover with taller aspect.
                            Let's go with cover + aspect-[4/3] (closer to square/portrait) which is better for posters than video(16:9).
                        */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={project.image_url} alt={project.title} className="h-full w-full object-cover transition-transform hover:scale-105" />
                    </div>
                )}
                <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{getTypeLabel(project.type)}</Badge>
                        <div className="flex gap-1">
                            {waitTime !== undefined && waitTime > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                    待ち {waitTime}分
                                </Badge>
                            )}
                            {project.fastpass_enabled && (
                                <Badge variant="secondary" className="text-xs">FP対象</Badge>
                            )}
                        </div>
                    </div>
                    <CardTitle className="line-clamp-1 text-lg">{project.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{project.class_id}</p>
                </CardHeader>
                <CardContent className="p-4 pt-0 flex-1">
                    <p className="line-clamp-2 text-sm text-gray-500">
                        {project.description || '説明文がありません'}
                    </p>
                </CardContent>
                <CardFooter className="p-4 pt-0 mt-auto flex items-center justify-between border-t bg-muted/20 px-4 py-3">
                    <span className="text-xs text-muted-foreground">混雑状況</span>
                    <StatusIcon level={congestionLevel} showLabel />
                </CardFooter>
            </Card>
        </Link>
    )
}
