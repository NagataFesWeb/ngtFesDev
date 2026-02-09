-- Migration: Add RPC for Project List with Wait Time
-- Run this in Supabase Dashboard > SQL Editor

-- Helper function to calculate wait time (Duplicating logic or reusing?)
-- We can reuse `get_estimated_wait_time` inside the query but calling it for every row might be slow if it does complex joins.
-- However, for < 50 projects, it's fine.

CREATE OR REPLACE FUNCTION public.get_projects_with_status()
RETURNS TABLE (
    project_id UUID,
    class_id TEXT,
    type TEXT,
    title TEXT,
    description TEXT,
    image_url TEXT,
    fastpass_enabled BOOLEAN,
    congestion_level INTEGER,
    wait_time_min INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.project_id,
        p.class_id,
        p.type,
        p.title,
        p.description,
        p.image_url,
        p.fastpass_enabled,
        COALESCE(c.level, 1) as congestion_level,
        public.get_estimated_wait_time(p.project_id) as wait_time_min
    FROM public.projects p
    LEFT JOIN public.congestion c ON p.project_id = c.project_id
    ORDER BY p.class_id;
END;
$$;
