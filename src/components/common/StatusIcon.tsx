import { cn } from '@/lib/utils'
import { Smile, Meh, Frown } from 'lucide-react'

type StatusLevel = 1 | 2 | 3

interface StatusIconProps {
    level: StatusLevel | number
    className?: string
    showLabel?: boolean
}

export const StatusIcon = ({ level, className, showLabel = false }: StatusIconProps) => {
    // Level 1: Green (Smile) - Empty
    // Level 2: Yellow (Meh) - Normal
    // Level 3: Red (Frown) - Crowded

    let Icon = Smile
    let colorClass = 'text-green-500'
    let label = '空き'

    if (level === 2) {
        Icon = Meh
        colorClass = 'text-yellow-500'
        label = '普通'
    } else if (level >= 3) {
        Icon = Frown
        colorClass = 'text-red-500'
        label = '混雑'
    }

    return (
        <div className={cn('flex items-center gap-1.5', className)}>
            <Icon className={cn('h-6 w-6', colorClass)} />
            {showLabel && <span className={cn('text-sm font-medium', colorClass)}>{label}</span>}
        </div>
    )
}
