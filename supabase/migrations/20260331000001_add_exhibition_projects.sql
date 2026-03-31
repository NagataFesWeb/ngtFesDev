-- 1-1の削除（展示をしないため）
DELETE FROM public.projects WHERE class_id = '1-1';
DELETE FROM public.classes WHERE class_id = '1-1';

-- 3-1を食品模擬として正しく設定
-- 他の場所に誤って存在する場合に備えて一旦削除（または更新）
DELETE FROM public.projects WHERE class_id = '3-1';
-- 3-1のクラス自体は残すが、念のためパスワード等を再設定
INSERT INTO public.classes (class_id, class_name, password_hash)
VALUES ('3-1', '3年1組', 'pass31')
ON CONFLICT (class_id) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- 展示団体の追加（DELETE + INSERT パターンで ON CONFLICT エラーを回避）
DELETE FROM public.projects WHERE class_id IN (
    'buturi', 'syasin', 'sakado', 'bijutu', 'tosyo', 
    'bungei', 'manken', 'suugaku', 'syodo', 'ESS', 
    'katei', 'sinbun', 'seibutu'
);

INSERT INTO public.classes (class_id, class_name, password_hash) VALUES
('buturi', '物理部', 'pass_buturi'),
('syasin', '写真部', 'pass_syasin'),
('sakado', '茶華道部', 'pass_sakado'),
('bijutu', '美術部', 'pass_bijutu'),
('tosyo', '図書委員会', 'pass_tosyo'),
('bungei', '文芸部', 'pass_bungei'),
('manken', '漫画研究部', 'pass_manken'),
('suugaku', '数学部', 'pass_suugaku'),
('syodo', '書道部', 'pass_syodo'),
('ESS', 'ESS 部', 'pass_ESS'),
('katei', '家庭部', 'pass_katei'),
('sinbun', '新聞委員会', 'pass_sinbun'),
('seibutu', '生物部', 'pass_seibutu')
ON CONFLICT (class_id) DO UPDATE SET
    class_name = EXCLUDED.class_name,
    password_hash = EXCLUDED.password_hash;

INSERT INTO public.projects (class_id, type, title, description, fastpass_enabled) VALUES
('3-1', 'food', '3-1 Yakisoba', '美味しい焼きそば', false),
('buturi', 'exhibition', '物理部', '物理現象の不思議を体験！驚きの実験が盛りだくさん。', false),
('syasin', 'exhibition', '写真部', '部員たちが切り取った珠玉の一枚。一瞬の美しさを展示します。', false),
('sakado', 'exhibition', '茶華道部', 'お茶と生け花の雅な世界。日本の伝統文化に触れてみませんか？', false),
('bijutu', 'exhibition', '美術部', '個性豊かな部員による独創的なアート作品の数々。', false),
('tosyo', 'exhibition', '図書委員会', '本の魅力を再発見！おすすめ本紹介やしおり製作など。', false),
('bungei', 'exhibition', '文芸部', '言葉に込めた想い。部誌の配布と作品展示を行います。', false),
('manken', 'exhibition', '漫画研究部', '魂の込もったイラスト・漫画展示。イラストのリクエストも募集中！', false),
('suugaku', 'exhibition', '数学部', '数学のパズルに挑戦！数学の楽しさを体験してください。', false),
('syodo', 'exhibition', '書道部', '迫力の筆致をご覧あれ。伝統と革新が融合した書の世界。', false),
('ESS', 'exhibition', 'ESS 部', 'Enjoy English! 英語で楽しくコミュニケーションしましょう。', false),
('katei', 'exhibition', '家庭部', '手作りの温もりを感じる小物の展示。部員による自信作です。', false),
('sinbun', 'exhibition', '新聞委員会', '最近の学校ニュースを凝縮！長田高校の「今」をお届けします。', false),
('seibutu', 'exhibition', '生物部', '校内に潜む生き物たちの生態を観察。生命の不思議に迫ります。', false);

-- 食品模擬・展示団体のファストパスを無効化
UPDATE public.projects 
SET fastpass_enabled = false 
WHERE type IN ('food', 'exhibition');

-- 無効化されたプロジェクトのファストパススロットを削除
DELETE FROM public.fastpass_slots 
WHERE project_id IN (
    SELECT project_id FROM public.projects WHERE fastpass_enabled = false
);

-- 混雑度の初期値設定
INSERT INTO public.congestion (project_id, level)
SELECT project_id, 1 FROM public.projects p
WHERE NOT EXISTS (
    SELECT 1 FROM public.congestion c WHERE c.project_id = p.project_id
)
ON CONFLICT (project_id) DO NOTHING;
