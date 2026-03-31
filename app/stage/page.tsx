import { supabase } from '@/lib/supabase'
import { StageClient } from './StageClient'
import { CautionNotes } from '@/components/common/CautionNotes'
import { PaymentNotes } from '@/components/common/PaymentNotes'
import { ProjectWithStatus } from '@/components/project/ProjectList'

export const revalidate = 60

export default async function StagePage() {
    const { data: projectsWithStatus, error } = await supabase.rpc('get_projects_with_status')

    if (error) {
        console.error('Error fetching projects:', error)
    }

    const stageProjects = ((projectsWithStatus as ProjectWithStatus[]) || []).filter(
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
