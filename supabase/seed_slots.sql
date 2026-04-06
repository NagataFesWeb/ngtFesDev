-- Seed FastPass Slots for FP対象プロジェクト（校内祭 2026-05-08 / 一般祭 2026-05-09）
-- Run this in Supabase Dashboard > SQL Editor（マイグレーション適用後）

DO $$
DECLARE
    r_project RECORD;
    v_school DATE := DATE '2026-05-08';
    v_public DATE := DATE '2026-05-09';
BEGIN
    FOR r_project IN SELECT project_id, title FROM public.projects WHERE fastpass_enabled = true LOOP
        RAISE NOTICE 'Seeding slots for: %', r_project.title;

        INSERT INTO public.fastpass_slots (project_id, start_time, end_time, capacity, festival_day)
        VALUES
            (r_project.project_id, (v_school || ' 09:30:00+09')::timestamptz, (v_school || ' 11:00:00+09')::timestamptz, 20, 'school'),
            (r_project.project_id, (v_school || ' 11:00:00+09')::timestamptz, (v_school || ' 12:00:00+09')::timestamptz, 20, 'school'),
            (r_project.project_id, (v_school || ' 13:00:00+09')::timestamptz, (v_school || ' 14:00:00+09')::timestamptz, 20, 'school'),
            (r_project.project_id, (v_school || ' 14:00:00+09')::timestamptz, (v_school || ' 15:00:00+09')::timestamptz, 20, 'school');

        INSERT INTO public.fastpass_slots (project_id, start_time, end_time, capacity, festival_day)
        VALUES
            (r_project.project_id, (v_public || ' 09:00:00+09')::timestamptz, (v_public || ' 11:00:00+09')::timestamptz, 20, 'public'),
            (r_project.project_id, (v_public || ' 11:00:00+09')::timestamptz, (v_public || ' 12:00:00+09')::timestamptz, 20, 'public'),
            (r_project.project_id, (v_public || ' 13:00:00+09')::timestamptz, (v_public || ' 14:00:00+09')::timestamptz, 20, 'public'),
            (r_project.project_id, (v_public || ' 14:00:00+09')::timestamptz, (v_public || ' 15:00:00+09')::timestamptz, 20, 'public');
    END LOOP;
END $$;
