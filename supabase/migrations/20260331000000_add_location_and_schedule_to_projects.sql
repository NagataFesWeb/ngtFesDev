-- Add new columns to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS schedule TEXT;

-- Update the RPC get_projects_with_status to include the new columns
DROP FUNCTION IF EXISTS public.get_projects_with_status();
CREATE OR REPLACE FUNCTION public.get_projects_with_status()
RETURNS TABLE (
    project_id UUID,
    class_id TEXT,
    type TEXT,
    title TEXT,
    description TEXT,
    image_url TEXT,
    location TEXT,
    schedule TEXT,
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
        p.location,
        p.schedule,
        p.fastpass_enabled,
        COALESCE(c.level, 1) as congestion_level,
        public.get_estimated_wait_time(p.project_id) as wait_time_min
    FROM public.projects p
    LEFT JOIN public.congestion c ON p.project_id = c.project_id
    ORDER BY p.class_id;
END;
$$;

-- Attempt to create public-assets storage bucket
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public) 
    VALUES ('public-assets', 'public-assets', true) 
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Add policies for the new bucket
DO $$
BEGIN
    CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'public-assets' );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'public-assets' );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
