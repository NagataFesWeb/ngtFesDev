import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export type FastpassSalesStatus = {
    school_open: boolean
    public_open: boolean
}

const defaultStatus: FastpassSalesStatus = {
    school_open: false,
    public_open: false,
}

export function useFastpassSalesStatus() {
    const [status, setStatus] = useState<FastpassSalesStatus>(defaultStatus)
    const [loading, setLoading] = useState(true)

    const refetch = useCallback(async () => {
        const { data, error } = await supabase.rpc('get_fastpass_sales_status')
        if (error) {
            console.error(error)
            setStatus(defaultStatus)
            setLoading(false)
            return
        }
        const row = data as { school_open?: boolean; public_open?: boolean } | null
        setStatus({
            school_open: !!row?.school_open,
            public_open: !!row?.public_open,
        })
        setLoading(false)
    }, [])

    useEffect(() => {
        const t = setTimeout(() => {
            void refetch()
        }, 0)
        return () => clearTimeout(t)
    }, [refetch])

    return { status, loading, refetch }
}
