import { supabase } from '@/lib/supabase'
import { ProjectList } from '@/components/project/ProjectList'

// Revalidate every 60 seconds (ISR) - Congestion is handled by client-side realtime, so base data can be cached.
export const revalidate = 60

export default async function ProjectsPage() {
    const { data: projectsWithStatus, error } = await supabase.rpc('get_projects_with_status')

    if (error) {
        console.error('Error fetching projects:', error)
        // Handle error gracefully or show empty
    }

    return (
        <ProjectList
            initialProjects={projectsWithStatus as any || []}
        />
    )
}
