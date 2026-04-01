-- Add sort_order column to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS sort_order INTEGER;

-- Update locations and sort_order for 2-1 to 2-8 (Classroom Mock)
UPDATE public.projects SET location = '301教室', sort_order = 101 WHERE class_id = '2-1' AND type = 'class';
UPDATE public.projects SET location = '302教室', sort_order = 102 WHERE class_id = '2-2' AND type = 'class';
UPDATE public.projects SET location = '303教室', sort_order = 103 WHERE class_id = '2-3' AND type = 'class';
UPDATE public.projects SET location = '304教室', sort_order = 104 WHERE class_id = '2-4' AND type = 'class';
UPDATE public.projects SET location = '305教室', sort_order = 105 WHERE class_id = '2-5' AND type = 'class';
UPDATE public.projects SET location = '306教室', sort_order = 106 WHERE class_id = '2-6' AND type = 'class';
UPDATE public.projects SET location = '307教室', sort_order = 107 WHERE class_id = '2-7' AND type = 'class';
UPDATE public.projects SET location = '308教室', sort_order = 108 WHERE class_id = '2-8' AND type = 'class';

-- Update locations and sort_order for 3-1 to 3-8 (Food Mock)
UPDATE public.projects SET location = '職員室前テント北側', sort_order = 201 WHERE class_id = '3-1' AND type = 'food';
UPDATE public.projects SET location = '職員室前テント南側', sort_order = 202 WHERE class_id = '3-2' AND type = 'food';
UPDATE public.projects SET location = '校門前テント北側', sort_order = 203 WHERE class_id = '3-3' AND type = 'food';
UPDATE public.projects SET location = '校門前テント南側', sort_order = 204 WHERE class_id = '3-4' AND type = 'food';
UPDATE public.projects SET location = '中庭北側テント周り', sort_order = 205 WHERE class_id = '3-5' AND type = 'food';
UPDATE public.projects SET location = '中庭南側テント周り', sort_order = 206 WHERE class_id = '3-6' AND type = 'food';
UPDATE public.projects SET location = 'ピロティ東側', sort_order = 207 WHERE class_id = '3-7' AND type = 'food';
UPDATE public.projects SET location = 'ピロティ西側', sort_order = 208 WHERE class_id = '3-8' AND type = 'food';

-- Update locations and sort_order for Exhibition projects
UPDATE public.projects SET location = '203教室', sort_order = 301 WHERE class_id = 'buturi' AND type = 'exhibition';
UPDATE public.projects SET location = '203教室', sort_order = 302 WHERE class_id = 'suugaku' AND type = 'exhibition';
UPDATE public.projects SET location = '204教室', sort_order = 303 WHERE class_id = 'tosyo' AND type = 'exhibition';
UPDATE public.projects SET location = '204教室', sort_order = 304 WHERE class_id = 'sinbun' AND type = 'exhibition';
UPDATE public.projects SET location = '205教室', sort_order = 305 WHERE class_id = 'syasin' AND type = 'exhibition';
UPDATE public.projects SET location = '302教室', sort_order = 306 WHERE class_id = 'manken' AND type = 'exhibition';
UPDATE public.projects SET location = '303教室', sort_order = 307 WHERE class_id = 'bungei' AND type = 'exhibition';
UPDATE public.projects SET location = '306教室', sort_order = 308 WHERE class_id = 'bijutu' AND type = 'exhibition';
UPDATE public.projects SET location = '306教室', sort_order = 309 WHERE class_id = 'katei' AND type = 'exhibition';
UPDATE public.projects SET location = '404教室', sort_order = 310 WHERE class_id = 'syodo' AND type = 'exhibition';
UPDATE public.projects SET location = '405教室', sort_order = 311 WHERE class_id = 'ESS' AND type = 'exhibition';
UPDATE public.projects SET location = '406教室', sort_order = 312 WHERE class_id = 'seibutu' AND type = 'exhibition';

-- Update Stage projects sort_order
-- Brass-band (Blows-band in Day 1)
UPDATE public.projects SET sort_order = 401 WHERE class_id = 'brass-band' AND type = 'stage';
-- Dance (Day 2)
UPDATE public.projects SET sort_order = 402 WHERE class_id = 'dance' AND type = 'stage';

-- Update get_projects_with_status RPC to sort by sort_order and class_id
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
    ORDER BY p.sort_order ASC, p.class_id ASC;
END;
$$;
