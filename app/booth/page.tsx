import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import { BoothClient } from './BoothClient'
import { CautionNotes } from '@/components/common/CautionNotes'
import { PaymentNotes } from '@/components/common/PaymentNotes'
import { ProjectWithStatus } from '@/components/project/ProjectList'
import { getProjectListGranular } from '@/lib/projectFetcher'

export const metadata: Metadata = {
    title: '模擬店',
}

export default async function BoothPage() {
    const { projectsWithStatus, globalFastpassEnabled, initialUpdatedAtMap, error } = await getProjectListGranular()

    if (error) {
        console.error('Error fetching projects:', error)
    }

    const boothProjects = (projectsWithStatus || []).filter(
        p => p.type === 'class' || p.type === 'food'
    )

    return (
        <div className="flex flex-col">
            <BoothClient 
                initialProjects={boothProjects} 
                globalFastpassEnabled={globalFastpassEnabled} 
                initialUpdatedAtMap={initialUpdatedAtMap}
            />
            <CautionNotes />
            <PaymentNotes />
        </div>
    )
}
