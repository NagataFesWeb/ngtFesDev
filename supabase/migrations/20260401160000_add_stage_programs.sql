-- Add new stage classes
INSERT INTO public.classes (class_id, class_name, password_hash)
VALUES 
    ('brass-band', '吹奏楽部', 'pass_brass_band'),
    ('dance', 'ダンス部', 'pass_dance')
ON CONFLICT (class_id) DO UPDATE SET
    class_name = EXCLUDED.class_name;

-- Add stage projects
INSERT INTO public.projects (class_id, type, title, description, location, schedule, fastpass_enabled)
VALUES 
    ('brass-band', 'stage', '吹奏楽部', '吹奏楽部による演奏をお楽しみください。', '講堂ステージ', '【１日目】 9:30 ～10:20\n【２日目】13:25～14:15', false),
    ('dance', 'stage', 'ダンス部', 'ダンス部によるパフォーマンスをお楽しみください。', '野外ステージ', '【２日目】9:15～9:55', false)
ON CONFLICT (class_id) DO UPDATE SET
    title = EXCLUDED.title,
    location = EXCLUDED.location,
    schedule = EXCLUDED.schedule;

-- Initialize congestion
INSERT INTO public.congestion (project_id, level)
SELECT project_id, 1 FROM public.projects p
WHERE class_id IN ('brass-band', 'dance')
ON CONFLICT (project_id) DO NOTHING;
