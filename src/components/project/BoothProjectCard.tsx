'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Clock } from 'lucide-react'
import { StatusIcon } from '@/components/common/StatusIcon'
import { Database } from '@/types/database.types'
import { getProjectTypeBadgeClassName, getProjectTypeLabel, getNormalizedProjectSchedule } from '@/lib/projectDisplay'

type Project = Database['public']['Tables']['projects']['Row']

interface BoothProjectCardProps {
    project: Project
    congestionLevel?: number
    waitTime?: number 
    hideClassId?: boolean
}

export const BoothProjectCard = ({ project, congestionLevel = 1, waitTime, hideClassId = false }: BoothProjectCardProps) => {
    const normalizedSchedule = getNormalizedProjectSchedule(project)

    return (
        <Link href={`/projects/${project.project_id}`}>
            <Card className="h-full overflow-hidden transition-all hover:shadow-md hover:border-primary/50 flex flex-col bg-white py-0">
                {project.image_url ? (
                    <div className="aspect-[4/3] w-full overflow-hidden bg-muted relative">
                        <Image src={project.image_url} alt={project.title} fill className="object-cover transition-transform hover:scale-105" />
                    </div>
                ) : (
                    <div className="aspect-[4/3] w-full bg-muted border-b flex items-center justify-center text-muted-foreground flex-col gap-2">
                        <span className="text-lg font-medium">Coming Soon...</span>
                    </div>
                )}
                <CardHeader className="px-7 py-5 pb-2">
                    <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className={getProjectTypeBadgeClassName(project.type, project.location)}>
                            {getProjectTypeLabel(project.type, project.location)}
                        </Badge>
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
                    {!hideClassId && <p className="text-sm text-muted-foreground">{project.class_id}</p>}
                </CardHeader>
                <CardContent className="px-7 py-5 pt-0 flex-1 flex flex-col">
                    {(project.location || project.schedule) && (
                        <div className="text-sm font-medium text-foreground flex flex-col gap-1 mb-2">
                            {project.location && (
                                <div className="flex items-start gap-1.5 align-middle">
                                    <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                                    <span>{project.location}</span>
                                </div>
                            )}
                            {project.schedule && (
                                <div className="flex items-start gap-1.5 align-middle">
                                    <Clock className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                                    <span className="whitespace-pre-wrap">{normalizedSchedule}</span>
                                </div>
                            )}
                        </div>
                    )}
                    <p className="line-clamp-2 text-sm text-gray-500 mt-auto whitespace-pre-wrap">
                        {project.description || '説明文がありません'}
                    </p>
                </CardContent>
                <CardFooter className="px-7 py-4 mt-auto flex items-center justify-between border-t bg-logo-background">
                    <span className="text-xs text-muted-foreground font-medium">混雑状況</span>
                    <StatusIcon level={congestionLevel} showLabel />
                </CardFooter>
            </Card>
        </Link>
    )
}
