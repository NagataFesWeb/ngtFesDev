import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export type SystemSettings = {
    voting_enabled: boolean
    quiz_enabled: boolean
    fastpass_enabled: boolean
}

export function useSystemSettings() {
    const [settings, setSettings] = useState<SystemSettings>({
        voting_enabled: true,
        quiz_enabled: true,
        fastpass_enabled: true,
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchSettings = async () => {
            const { data, error } = await supabase
                .from('system_settings')
                .select('*')

            if (data) {
                const newSettings: any = {}
                data.forEach((item: any) => {
                    newSettings[item.key] = item.value // Assuming item.value is boolean from JSONB
                })
                setSettings(prev => ({ ...prev, ...newSettings }))
            }
            if (error) {
                console.error('Error fetching settings:', error)
            }
            setLoading(false)
        }

        fetchSettings()

        // Optional: Realtime subscription could go here
    }, [])

    return { settings, loading }
}
