import { supabase } from '@/lib/supabase'
import { DisplayClient } from './DisplayClient'
import { CautionNotes } from '@/components/common/CautionNotes'
import { PaymentNotes } from '@/components/common/PaymentNotes'
import { ProjectWithStatus } from '@/components/project/ProjectList'

export const revalidate = 60

export default async function DisplayPage() {
    const { data: projectsWithStatus, error } = await supabase.rpc('get_projects_with_status')

    if (error) {
        console.error('Error fetching projects:', error)
    }

    const displayProjects = ((projectsWithStatus as ProjectWithStatus[]) || []).filter(
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
