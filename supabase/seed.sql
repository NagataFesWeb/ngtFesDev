-- Classes
INSERT INTO public.classes (class_id, class_name, password_hash) VALUES
('1-1', '1年1組', 'pass11'),
('3-1', '3年1組', 'pass31');

-- Projects
INSERT INTO public.projects (class_id, type, title, description, fastpass_enabled) VALUES
('1-1', 'exhibition', '1-1 Exhibition', 'Great exhibition', false),
('3-1', 'food', '3-1 Yakisoba', 'Delicious yakisoba', true);

-- Init Congestion for projects
INSERT INTO public.congestion (project_id, level) 
SELECT project_id, 1 FROM public.projects;

-- Quiz Questions
INSERT INTO public.quiz_questions (question_text, choices, correct_choice_index) VALUES
('長田高校の創立年は？', '["1918", "1920", "1921", "1945"]'::jsonb, 1),
('文化祭の名前は？', '["長田フェス", "文化祭", "神撫祭", "体育祭"]'::jsonb, 0);
