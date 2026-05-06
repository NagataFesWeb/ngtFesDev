import { Database } from '@/types/database.types'
import { ProjectWithStatus } from '@/components/project/ProjectList'

type Project = Database['public']['Tables']['projects']['Row']

const CACHE_STATIC = 3600 // 1 hour
const CACHE_DYNAMIC = 60 // 1 minute

export async function getProjectListGranular() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const headers = {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
    }

    try {
        const [projectsRes, statusRes, fpSettingRes, congestionRes] = await Promise.all([
            // Static info: 1 hour cache
            fetch(`${supabaseUrl}/rest/v1/projects?select=*&order=sort_order.asc,class_id.asc`, {
                headers,
                next: { revalidate: CACHE_STATIC }
            }),
            // Dynamic info: 1 minute cache
            fetch(`${supabaseUrl}/rest/v1/rpc/get_projects_with_status`, {
                method: 'POST',
                headers,
                next: { revalidate: CACHE_DYNAMIC }
            }),
            // System settings: 1 minute cache
            fetch(`${supabaseUrl}/rest/v1/system_settings?key=eq.fastpass_enabled&select=value`, {
                headers,
                next: { revalidate: CACHE_DYNAMIC }
            }),
            // Congestion updated_at: 1 minute cache
            fetch(`${supabaseUrl}/rest/v1/congestion?select=project_id,updated_at`, {
                headers,
                next: { revalidate: CACHE_DYNAMIC }
            })
        ])

        const projects = (await projectsRes.json()) as Project[]
        const statusList = (await statusRes.json()) as any[]
        const fpSetting = await fpSettingRes.json()
        const congestionData = await congestionRes.json()

        const globalFastpassEnabled = fpSetting?.[0]?.value === 'true' || fpSetting?.[0]?.value === true

        const initialUpdatedAtMap: Record<string, string> = {}
        if (Array.isArray(congestionData)) {
            congestionData.forEach(c => {
                if (c.updated_at) initialUpdatedAtMap[c.project_id] = c.updated_at
            })
        }

        const mergedProjects: ProjectWithStatus[] = Array.isArray(projects) ? projects.map(p => {
            const status = Array.isArray(statusList) ? statusList.find(s => s.project_id === p.project_id) : null
            return {
                project_id: p.project_id,
                class_id: p.class_id ?? '',
                type: p.type ?? '',
                title: p.title,
                description: p.description ?? '',
                image_url: p.image_url ?? '',
                location: p.location,
                schedule: p.schedule,
                fastpass_enabled: p.fastpass_enabled ?? false,
                congestion_level: status?.congestion_level ?? 1,
                wait_time_min: status?.wait_time_min ?? 0
            }
        }) : []

        return { projectsWithStatus: mergedProjects, globalFastpassEnabled, initialUpdatedAtMap, error: null }
    } catch (err) {
        console.error('Error fetching project list granularly:', err)
        return { projectsWithStatus: [], globalFastpassEnabled: true, initialUpdatedAtMap: {}, error: 'Failed to fetch projects' }
    }
}
