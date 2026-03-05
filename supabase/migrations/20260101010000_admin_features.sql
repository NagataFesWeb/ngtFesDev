-- Helper: Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Create system_settings table for Feature Toggles
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS: Only admins can manage, everyone can read (or maybe just authenticated?)
-- For now, public read is fine for feature flags like "is_voting_open"
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on system_settings"
    ON public.system_settings
    FOR ALL
    USING (public.is_admin());

CREATE POLICY "Everyone can view system_settings"
    ON public.system_settings
    FOR SELECT
    USING (true);

-- Insert default settings
INSERT INTO public.system_settings (key, value, description) VALUES
-- ('voting_enabled', 'true'::jsonb, 'Enable or disable visitor voting'),
('quiz_enabled', 'true'::jsonb, 'Enable or disable quiz feature'),
('fastpass_enabled', 'true'::jsonb, 'Enable or disable fastpass issuance')
ON CONFLICT (key) DO NOTHING;

-- RPC to get all projects with congestion (Admin View)
-- Joins projects and classes to get readable names
CREATE OR REPLACE FUNCTION public.admin_get_projects_status()
RETURNS TABLE (
    project_id UUID,
    title TEXT,
    class_name TEXT,
    congestion_level INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        p.project_id,
        p.title,
        c.class_name,
        COALESCE(cg.level, 1) as congestion_level,
        cg.updated_at
    FROM public.projects p
    JOIN public.classes c ON p.class_id = c.class_id
    LEFT JOIN public.congestion cg ON p.project_id = cg.project_id
    ORDER BY c.class_name;
$$;

-- RPC to update feature toggle
CREATE OR REPLACE FUNCTION public.admin_update_setting(p_key TEXT, p_value JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check admin
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('status', 403, 'message', 'Forbidden');
    END IF;

    UPDATE public.system_settings
    SET value = p_value, updated_at = NOW()
    WHERE key = p_key;

    RETURN jsonb_build_object('status', 'success', 'key', p_key, 'value', p_value);
END;
$$;

-- RPC to toggle fastpass status (stop/resume) for a project
-- For simplicity, let's assume `projects` has a `fastpass_available` boolean or similar?
-- Checking schema: `projects` table definition not fully visible.
-- Let's add a column to projects if needed, or assume it exists.
-- Actually, let's stick to system-wide or per-project.
-- If per-project, we might need an `is_active` flag in `fastpass_slots`.
-- For MVP, let's implement a global toggle in system_settings (done above) and maybe per-project logic later.
