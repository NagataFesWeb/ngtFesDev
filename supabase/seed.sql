-- Classes
INSERT INTO public.classes (class_id, class_name, password_hash) VALUES
('PhysicsClub', '物理部', 'pass_PhysicsClub'),
('PhotoClub', '写真部', 'pass_PhotoClub');

-- Projects
INSERT INTO public.projects (class_id, type, title, description, fastpass_enabled) VALUES
('PhysicsClub', 'exhibition', '物理部', '', false),
('PhotoClub', 'exhibition', '写真部', '', false);

-- Init Congestion for projects
INSERT INTO public.congestion (project_id, level) 
SELECT project_id, 1 FROM public.projects;

-- Quiz Questions
INSERT INTO public.quiz_questions (question_text, choices, correct_choice_index) VALUES
('長田高校の創立年は？', '["1918", "1920", "1921", "1945"]'::jsonb, 1),
('文化祭の名前は？', '["長田フェス", "文化祭", "神撫祭", "体育祭"]'::jsonb, 0);
