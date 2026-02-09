-- Seed FastPass Slots for existing class projects
-- Run this in Supabase Dashboard > SQL Editor

DO $$
DECLARE
    r_project RECORD;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- Iterate over class projects
    FOR r_project IN SELECT project_id, title FROM public.projects WHERE type IN ('class', 'food', 'stage', 'exhibition') LOOP
        
        RAISE NOTICE 'Seeding slots for: %', r_project.title;

        -- Create slots for 10:00 - 11:00 (Capacity 20)
        INSERT INTO public.fastpass_slots (project_id, start_time, end_time, capacity)
        VALUES (
            r_project.project_id,
            (v_today || ' 10:00:00+09')::TIMESTAMP WITH TIME ZONE,
            (v_today || ' 11:00:00+09')::TIMESTAMP WITH TIME ZONE,
            20
        ) ON CONFLICT DO NOTHING;

        -- Create slots for 11:00 - 12:00 (Capacity 20)
        INSERT INTO public.fastpass_slots (project_id, start_time, end_time, capacity)
        VALUES (
            r_project.project_id,
            (v_today || ' 11:00:00+09')::TIMESTAMP WITH TIME ZONE,
            (v_today || ' 12:00:00+09')::TIMESTAMP WITH TIME ZONE,
            20
        ) ON CONFLICT DO NOTHING;

        -- Create slots for 13:00 - 14:00 (Capacity 20)
        INSERT INTO public.fastpass_slots (project_id, start_time, end_time, capacity)
        VALUES (
            r_project.project_id,
            (v_today || ' 13:00:00+09')::TIMESTAMP WITH TIME ZONE,
            (v_today || ' 14:00:00+09')::TIMESTAMP WITH TIME ZONE,
            20
        ) ON CONFLICT DO NOTHING;

        -- Create slots for 14:00 - 15:00 (Capacity 20)
        INSERT INTO public.fastpass_slots (project_id, start_time, end_time, capacity)
        VALUES (
            r_project.project_id,
            (v_today || ' 14:00:00+09')::TIMESTAMP WITH TIME ZONE,
            (v_today || ' 15:00:00+09')::TIMESTAMP WITH TIME ZONE,
            20
        ) ON CONFLICT DO NOTHING;
        
        -- Enable FastPass for these projects
        UPDATE public.projects 
        SET fastpass_enabled = true 
        WHERE project_id = r_project.project_id;
        
    END LOOP;
END $$;
