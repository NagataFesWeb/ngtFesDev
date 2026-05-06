import type { Metadata } from 'next'
import { DisplayClient } from './DisplayClient'
import { CautionNotes } from '@/components/common/CautionNotes'
import { PaymentNotes } from '@/components/common/PaymentNotes'
import { getProjectListGranular } from '@/lib/projectFetcher'

export const metadata: Metadata = {
    title: '展示',
}

export default async function DisplayPage() {
    const { projectsWithStatus, error } = await getProjectListGranular()

    if (error) {
        console.error('Error fetching projects:', error)
    }

    const displayProjects = (projectsWithStatus || []).filter(
        p => p.type === 'exhibition'
    )

    return (
        <div className="flex flex-col">
            <DisplayClient initialProjects={displayProjects} />
            <CautionNotes />
            <PaymentNotes />
        </div>
    )
}
