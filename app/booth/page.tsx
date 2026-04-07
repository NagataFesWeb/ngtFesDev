import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import { BoothClient } from './BoothClient'
import { CautionNotes } from '@/components/common/CautionNotes'
import { PaymentNotes } from '@/components/common/PaymentNotes'
import { ProjectWithStatus } from '@/components/project/ProjectList'

export const metadata: Metadata = {
    title: '模擬店',
}

export const revalidate = 60

export default async function BoothPage() {
    const [
        { data: projectsWithStatus, error },
        { data: fpSetting }
    ] = await Promise.all([
        supabase.rpc('get_projects_with_status'),
        supabase.from('system_settings').select('value').eq('key', 'fastpass_enabled').single()
    ])

    const globalFastpassEnabled = fpSetting?.value === true || fpSetting?.value === 'true'

    if (error) {
        console.error('Error fetching projects:', error)
    }

    const boothProjects = ((projectsWithStatus as ProjectWithStatus[]) || []).filter(
        p => p.type === 'class' || p.type === 'food'
    )

    return (
        <div className="flex flex-col">
            <BoothClient initialProjects={boothProjects} globalFastpassEnabled={globalFastpassEnabled} />
            <CautionNotes />
            <PaymentNotes />
        </div>
    )
}
