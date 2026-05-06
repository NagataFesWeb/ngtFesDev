import type { Metadata } from 'next'
import { StageClient } from './StageClient'
import { CautionNotes } from '@/components/common/CautionNotes'
import { PaymentNotes } from '@/components/common/PaymentNotes'
import { getProjectListGranular } from '@/lib/projectFetcher'

export const metadata: Metadata = {
    title: 'ステージ',
}

export default async function StagePage() {
    const { projectsWithStatus, error } = await getProjectListGranular()

    if (error) {
        console.error('Error fetching projects:', error)
    }

    const stageProjects = (projectsWithStatus || []).filter(
        p => p.type === 'stage'
    )

    return (
        <div className="flex flex-col">
            <StageClient initialProjects={stageProjects} />
            <CautionNotes />
            <PaymentNotes />
        </div>
    )
}
