'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Clock } from 'lucide-react'
import { StatusIcon } from '@/components/common/StatusIcon'
import { Database } from '@/types/database.types'

type Project = Database['public']['Tables']['projects']['Row']

interface ProjectCardProps {
    project: Project
    congestionLevel?: number
    waitTime?: number
    hideClassId?: boolean
    hideCongestion?: boolean
}

export const ProjectCard = ({ 
    project, 
    congestionLevel = 1, 
    waitTime, 
    hideClassId = false,
    hideCongestion = false 
}: ProjectCardProps) => {
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
            <Card className="group h-full overflow-hidden transition-all hover:shadow-lg hover:border-primary/40 flex flex-col relative bg-card">
                {/* Decorative slant for cards without congestion footer */}
                {hideCongestion && (
                    <div className="absolute top-0 left-0 w-24 h-24 bg-logo-background/30 -translate-x-12 -translate-y-12 rotate-45 pointer-events-none z-0" />
                )}

                {project.image_url && (
                    <div className="aspect-[4/3] w-full overflow-hidden bg-muted relative z-10">
                        <Image 
                            src={project.image_url} 
                            alt={project.title} 
                            fill 
                            className="object-cover transition-all duration-500 group-hover:scale-105" 
                        />
                        <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
                    </div>
                )}
                
                <CardHeader className="p-5 pb-3 relative z-10">
                    <div className="flex items-center justify-between mb-3">
                        <Badge variant="secondary" className="font-semibold px-2 py-0.5 bg-secondary/80 backdrop-blur-sm">
                            {getTypeLabel(project.type)}
                        </Badge>
                        <div className="flex gap-1.5">
                            {!hideCongestion && waitTime !== undefined && waitTime > 0 && (
                                <Badge variant="destructive" className="text-xs font-bold px-2 py-0.5 shadow-sm">
                                    待ち {waitTime}分
                                </Badge>
                            )}
                            {project.fastpass_enabled && (
                                <Badge variant="outline" className="text-xs border-primary/30 bg-primary/5 px-2 py-0.5">FP対象</Badge>
                            )}
                        </div>
                    </div>
                    <CardTitle className="line-clamp-1 text-xl font-bold tracking-tight group-hover:text-primary transition-colors">
                        {project.title}
                    </CardTitle>
                    {!hideClassId && (
                        <p className="text-sm font-medium text-muted-foreground mt-0.5">
                            {project.class_id}
                        </p>
                    )}
                </CardHeader>

                <CardContent className={`p-5 pt-0 flex-1 flex flex-col relative z-10 ${hideCongestion ? 'pb-8' : ''}`}>
                    {(project.location || project.schedule) && (
                        <div className="text-sm font-medium text-foreground flex flex-col gap-2 mb-4 bg-muted/40 p-3 rounded-lg border border-muted/50">
                            {project.location && (
                                <div className="flex items-start gap-2 align-middle">
                                    <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary/70" />
                                    <span className="line-clamp-1">{project.location}</span>
                                </div>
                            )}
                            {project.schedule && (
                                <div className="flex items-start gap-2 align-middle border-t border-muted-foreground/10 pt-2">
                                    <Clock className="w-4 h-4 mt-0.5 shrink-0 text-primary/70" />
                                    <span className="text-xs leading-relaxed whitespace-pre-wrap">{project.schedule}</span>
                                </div>
                            )}
                        </div>
                    )}
                    <p className="line-clamp-3 text-sm text-muted-foreground leading-relaxed mt-auto">
                        {project.description || '説明文がありません'}
                    </p>
                </CardContent>

                {!hideCongestion && (
                    <CardFooter className="p-4 mt-auto flex items-center justify-between border-t bg-logo-background/40 backdrop-blur-sm px-5 py-3.5 relative z-10">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">混雑状況</span>
                        <StatusIcon level={congestionLevel} showLabel />
                    </CardFooter>
                )}
            </Card>
        </Link>
    )
}
