import { Database } from '@/types/database.types'

type Project = Database['public']['Tables']['projects']['Row']

export const getProjectTypeLabel = (type: string | null, location: string | null) => {
    if (type === 'stage') {
        if (location?.includes('講堂')) return '講堂ステージ'
        if (location?.includes('野外')) return '野外ステージ'
        return 'ステージ'
    }

    switch (type) {
        case 'food':
            return '食品模擬'
        case 'class':
            return '教室模擬'
        case 'exhibition':
            return '展示'
        default:
            return 'その他'
    }
}

export const getProjectTypeBadgeClassName = (type: string | null, location: string | null) => {
    const label = getProjectTypeLabel(type, location)

    switch (label) {
        case '教室模擬':
            return 'bg-sky-100 text-sky-700 border-sky-200'
        case '食品模擬':
            return 'bg-amber-100 text-amber-700 border-amber-200'
        case '展示':
            return 'bg-emerald-100 text-emerald-700 border-emerald-200'
        case '野外ステージ':
            return 'bg-violet-100 text-violet-700 border-violet-200'
        case '講堂ステージ':
            return 'bg-rose-100 text-rose-700 border-rose-200'
        default:
            return 'bg-muted text-muted-foreground border-border'
    }
}

export const normalizeEscapedNewlines = (value: string | null | undefined) =>
    value ? value.replace(/\\n/g, '\n') : value

export const getNormalizedProjectSchedule = (project: Project) =>
    normalizeEscapedNewlines(project.schedule) ?? ''
