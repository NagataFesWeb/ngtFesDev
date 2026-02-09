-- Add more seed data for Class and Food projects
-- 2nd Year: Class Exhibitions (2-1 to 2-8)
-- 3rd Year: Food Projects (3-1 to 3-8)

-- 1. Insert Classes
INSERT INTO public.classes (class_id, class_name, password_hash) VALUES
('2-1', '2年1組', 'pass21'),
('2-2', '2年2組', 'pass22'),
('2-3', '2年3組', 'pass23'),
('2-4', '2年4組', 'pass24'),
('2-5', '2年5組', 'pass25'),
('2-6', '2年6組', 'pass26'),
('2-7', '2年7組', 'pass27'),
('2-8', '2年8組', 'pass28'),
('3-2', '3年2組', 'pass32'),
('3-3', '3年3組', 'pass33'),
('3-4', '3年4組', 'pass34'),
('3-5', '3年5組', 'pass35'),
('3-6', '3年6組', 'pass36'),
('3-7', '3年7組', 'pass37'),
('3-8', '3年8組', 'pass38')
ON CONFLICT (class_id) DO NOTHING;

-- 2. Insert Projects
-- 2-x: Class Exhibition (type='class'), FastPass enabled for some? Let's say odd numbers enabled.
INSERT INTO public.projects (class_id, type, title, description, fastpass_enabled, image_url) VALUES
('2-1', 'class', 'VS 2-1', '2-1のVSパークへようこそ！', true, NULL),
('2-2', 'class', 'Haunted 2-2', '最恐のお化け屋敷', false, NULL),
('2-3', 'class', 'Casino 2-3', '大人の社交場カジノ', true, NULL),
('2-4', 'class', 'Maze 2-4', '脱出不可能迷路', false, NULL),
('2-5', 'class', 'Cinema 2-5', '自作映画上映', true, NULL),
('2-6', 'class', 'Photo 2-6', '映えスポット写真館', false, NULL),
('2-7', 'class', 'Coffee 2-7', '喫茶店 (展示)', true, NULL),
('2-8', 'class', 'Game 2-8', 'レトロゲームセンター', false, NULL),

-- 3-x: Food (type='food'), FastPass usually enabled for food to reduce lines? Let's mix.
('3-2', 'food', '3-2 Curry', 'スパイスから作ったカレー', true, NULL),
('3-3', 'food', '3-3 Crepe', '甘くて美味しいクレープ', true, NULL),
('3-4', 'food', '3-4 Frankfurt', 'アツアツフランクフルト', false, NULL),
('3-5', 'food', '3-5 Tapioca', 'タピオカドリンク専門店', true, NULL),
('3-6', 'food', '3-6 Burger', '特製ハンバーガー', true, NULL),
('3-7', 'food', '3-7 Udon', '手打ちうどん', false, NULL),
('3-8', 'food', '3-8 Ice', 'サーティワンアイスクリーム', true, NULL)
ON CONFLICT DO NOTHING; -- Assuming titles or logic avoids conflict, but IDs are UUIDs gen_random. 
-- Note: 'class_id' is NOT unique in projects table, but logically one project per class usually.


-- 3. Init Congestion for new projects
-- Insert congestion level 1 for any project that doesn't have it yet
INSERT INTO public.congestion (project_id, level)
SELECT p.project_id, 1
FROM public.projects p
WHERE NOT EXISTS (
    SELECT 1 FROM public.congestion c WHERE c.project_id = p.project_id
);
