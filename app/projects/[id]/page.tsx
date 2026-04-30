import { ProjectClient } from './ProjectClient'
import { ErrorMessage } from '@/components/ui/error-message'
import { Database } from '@/types/database.types'

type Project = Database['public']['Tables']['projects']['Row']
type FastPassSlot = Database['public']['Tables']['fastpass_slots']['Row']

// Cache configuration
const CACHE_PROJECT = 3600 // 1 hour
const CACHE_CONGESTION = 60 // 1 minute


async function getProjectData(id: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const headers = {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
    }

    try {
        // Fetch project details (1 hour cache)
        const projectRes = await fetch(`${supabaseUrl}/rest/v1/projects?project_id=eq.${id}&select=*`, {
            headers,
            next: { revalidate: CACHE_PROJECT },
        })
        const projects = (await projectRes.json()) as Project[]
        const project = projects?.[0] || null

        if (!project) return { project: null, error: 'Project not found' }

        // Fetch congestion level (1 minute cache)
        const congestionRes = await fetch(`${supabaseUrl}/rest/v1/congestion?project_id=eq.${id}&select=level`, {
            headers,
            next: { revalidate: CACHE_CONGESTION },
        })
        const congestionData = await congestionRes.json()
        const congestionLevel = congestionData?.[0]?.level ?? 1

        // Fetch wait time (1 minute cache)
        const waitTimeRes = await fetch(`${supabaseUrl}/rest/v1/rpc/get_estimated_wait_time`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ p_project_id: id }),
            next: { revalidate: CACHE_CONGESTION },
        })
        const waitTime = await waitTimeRes.json()

        // Fetch slots if fastpass enabled (1 minute cache for slots as they change frequently)
        let slots: FastPassSlot[] = []
        if (project.fastpass_enabled) {
            const slotsRes = await fetch(`${supabaseUrl}/rest/v1/fastpass_slots?project_id=eq.${id}&select=*&order=start_time.asc`, {
                headers,
                next: { revalidate: CACHE_CONGESTION },
            })
            slots = (await slotsRes.json()) || []
        }

        return { project, congestionLevel, waitTime: waitTime ?? 0, slots, error: null }
    } catch (err) {
        console.error('Error fetching project data:', err)
        return { project: null, error: 'Failed to fetch project data' }
    }
}

export default async function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const { project, congestionLevel, waitTime, slots, error } = await getProjectData(id)

    if (error || !project) {
        return <div className="p-8"><ErrorMessage message={error || 'Project not found'} /></div>
    }

    return (
        <ProjectClient 
            project={project}
            initialCongestionLevel={congestionLevel}
            initialWaitTime={waitTime}
            initialSlots={slots}
            id={id}
        />
    )
}
