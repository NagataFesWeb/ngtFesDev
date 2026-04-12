-- 11.2 クラスデータ（2年・3年）
INSERT INTO public.classes (class_id, class_name, password_hash) VALUES
('2-1', '2年1組', 'pass_2-1'),
('2-2', '2年2組', 'pass_2-2'),
('2-3', '2年3組', 'pass_2-3'),
('2-4', '2年4組', 'pass_2-4'),
('2-56', '2年5組・6組', 'pass_2-56'),
('2-7', '2年7組', 'pass_2-7'),
('2-8', '2年8組', 'pass_2-8'),
('3-1', '3年1組', 'pass_3-1'),
('3-2', '3年2組', 'pass_3-2'),
('3-3', '3年3組', 'pass_3-3'),
('3-4', '3年4組', 'pass_3-4'),
('3-5', '3年5組', 'pass_3-5'),
('3-6', '3年6組', 'pass_3-6'),
('3-7', '3年7組', 'pass_3-7'),
('3-8', '3年8組', 'pass_3-8')
ON CONFLICT (class_id) DO NOTHING;

-- 11.3 プロジェクトデータ
INSERT INTO public.projects (class_id, type, title, description, fastpass_enabled, image_url, location, sort_order) VALUES
-- 2年：クラス展示
('2-1', 'class', 'VS 2-1',       '2-1のVSパークへようこそ！',     true,  NULL, '301教室', 101),
('2-2', 'class', 'Haunted 2-2',  '最恐のお化け屋敷',              false, NULL, '302教室', 102),
('2-3', 'class', 'Casino 2-3',   '大人の社交場カジノ',            true,  NULL, '303教室', 103),
('2-4', 'class', 'Maze 2-4',     '脱出不可能迷路',                false, NULL, '304教室', 104),
('2-56', 'class', 'Haunted 2-5&6', '2年5組・6組合同のお化け屋敷', false, NULL, '305・306教室', 105),
('2-7', 'class', 'Coffee 2-7',   '喫茶店 (展示)',                  true,  NULL, '307教室', 107),
('2-8', 'class', 'Game 2-8',     'レトロゲームセンター',          false, NULL, '308教室', 108),
-- 3年：フード
('3-1', 'food',  '3-1 Yakisoba', '美味しい焼きそば',              false, NULL, '職員室前テント北側', 201),
('3-2', 'food',  '3-2 Curry',    'スパイスから作ったカレー',      false, NULL, '職員室前テント南側', 202),
('3-3', 'food',  '3-3 Crepe',    '甘くて美味しいクレープ',        false, NULL, '校門前テント北側', 203),
('3-4', 'food',  '3-4 Frankfurt','アツアツフランクフルト',        false, NULL, '校門前テント南側', 204),
('3-5', 'food',  '3-5 Tapioca',  'タピオカドリンク専門店',        false, NULL, '中庭北側テント周り', 205),
('3-6', 'food',  '3-6 Burger',   '特製ハンバーガー',              false, NULL, '中庭南側テント周り', 206),
('3-7', 'food',  '3-7 Udon',     '手打ちうどん',                  false, NULL, 'ピロティ東側', 207),
('3-8', 'food',  '3-8 Ice',      'サーティワンアイスクリーム',    false, NULL, 'ピロティ西側', 208)
ON CONFLICT DO NOTHING;

-- 11.4 全プロジェクトの混雑度初期値（レベル1）
INSERT INTO public.congestion (project_id, level)
SELECT p.project_id, 1
FROM public.projects p
WHERE NOT EXISTS (
    SELECT 1 FROM public.congestion c WHERE c.project_id = p.project_id
);

-- 11.5 追加のシードデータ
-- Classes (Exhibition & Stage)
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
('seibutu', '生物部', 'pass_seibutu'),
('brass-band', '吹奏楽部', 'pass_brass_band'),
('dance', 'ダンス部', 'pass_dance'),
('specios', 'Specios', 'pass_specios'),
('broadcasting', '放送委員会', 'pass_broadcasting'),
('drama', '演劇部', 'pass_drama'),
('catherine', 'キャサリンのまつげ。', 'pass_catherine'),
('shumatsu', '週末ホールディングス', 'pass_shumatsu'),
('iris-blue', 'IRIS blue', 'pass_iris-blue'),
('music', '音楽部', 'pass_music'),
('copy-cat', 'Copy Cat', 'pass_copy_cat'),
('line', 'line', 'pass_line'),
('koshianen', 'こしあねん', 'pass_koshianen'),
('nanala', 'nanala', 'pass_nanala'),
('traverse', 'Traverse', 'pass_traverse'),
('ousia', 'Ousia', 'pass_ousia'),
('milky', 'Milky♡', 'pass_milky')
ON CONFLICT (class_id) DO NOTHING;

-- Projects (Exhibition)
INSERT INTO public.projects (class_id, type, title, description, fastpass_enabled, location, schedule, sort_order) VALUES
('sakado', 'exhibition', '茶華道部', 'お茶と生け花の雅な世界。日本の伝統文化に触れてみませんか？', false, '家庭準備室・作法室', NULL, 301),
('bijutu', 'exhibition', '美術部', '個性豊かな部員による独創的なアート作品の数々。', false, '306教室', NULL, 308),
('tosyo', 'exhibition', '図書委員会', '本の魅力を再発見！おすすめ本紹介やしおり製作など。', false, '204教室', NULL, 303),
('bungei', 'exhibition', '文芸部', '言葉に込めた想い。部誌の配布と作品展示を行います。', false, '303教室', NULL, 307),
('manken', 'exhibition', '漫画研究部', '魂の込もったイラスト・漫画展示。イラストのリクエストも募集中！', false, '302教室', NULL, 306),
('suugaku', 'exhibition', '数学部', '数字のパズルに挑戦！数学の楽しさを体験してください。', false, '203教室', NULL, 302),
('syodo', 'exhibition', '書道部', '迫力の筆致をご覧あれ。伝統と革新が融合した書の世界。', false, '404教室', NULL, 310),
('ESS', 'exhibition', 'ESS 部', 'Enjoy English! 英語で楽しくコミュニケーションしましょう。', false, '405教室', NULL, 311),
('katei', 'exhibition', '家庭部', '手作りの温もりを感じる小物の展示。部員による自信作です。', false, '306教室', NULL, 309),
('sinbun', 'exhibition', '新聞委員会', '最近の学校ニュースを凝縮！長田高校の「今」をお届けします。', false, '204教室', NULL, 304),
('seibutu', 'exhibition', '生物部', '校内に潜む生き物たちの生態を観察。生命の不思議に迫ります。', false, '406教室', NULL, 312)
ON CONFLICT DO NOTHING;

-- Projects (Stage)
INSERT INTO public.projects (class_id, type, title, description, fastpass_enabled, location, schedule, sort_order) VALUES
('brass-band', 'stage', '吹奏楽部', '吹奏楽部による圧巻のパフォーマンス！', false, '講堂ステージ', '【１日目】 9:30～10:20\n【２日目】 10:35～11:25', 401),
('specios', 'stage', 'Specios', '野外ステージを熱く盛り上げます！', false, '野外ステージ', '【１日目】 10:10～10:30', 402),
('broadcasting', 'stage', '放送委員会', '放送委員会による特別ステージ企画。', false, '講堂ステージ', '【１日目】 10:35～11:05\n【２日目】 9:50～10:20', 403),
('drama', 'stage', '演劇部', '演劇部渾身の舞台をご堪能ください。', false, '講堂ステージ', '【１日目】 11:20～12:20\n【２日目】 13:05～14:05', 404),
('catherine', 'stage', 'キャサリンのまつげ。', '個性溢れるパフォーマンスをお届けします！', false, '野外ステージ', '【１日目】 12:25～12:45', 405),
('shumatsu', 'stage', '週末ホールディングス', '講堂が笑いと熱気に包まれる！', false, '講堂ステージ', '【１日目】 12:35～13:05', 406),
('iris-blue', 'stage', 'IRIS blue', '最高にブルーな青春ステージ！', false, '野外ステージ', '【１日目】 13:00～13:20', 407),
('music', 'stage', '音楽部', '美しいハーモニーと演奏をお楽しみください。', false, '講堂ステージ', '【１日目】 13:20～14:20\n【２日目】 11:45～12:45', 408),
('copy-cat', 'stage', 'Copy Cat', '誰でも知ってるあの曲を！', false, '野外ステージ', '【１日目】 14:35～15:00', 409),
('line', 'stage', 'line', '洗練されたステージパフォーマンスを披露。', false, '講堂ステージ', '【１日目】 14:35～14:55', 410),
('syodo', 'stage', '書道部（パフォーマンス）', '書道部による大迫力のパフォーマンス！', false, '講堂ステージ', '【２日目】 9:20～9:40', 411),
('koshianen', 'stage', 'こしあねん', 'みんなで一緒に盛り上がりましょう！', false, '野外ステージ', '【２日目】 9:30～9:50', 412),
('nanala', 'stage', 'nanala', '元気いっぱいのステージをお届け！', false, '野外ステージ', '【２日目】 10:20～10:40', 413),
('dance', 'stage', 'ダンス部', 'ダンス部による圧巻のパフォーマンス！', false, '野外ステージ', '【２日目】 11:05～11:45', 414),
('traverse', 'stage', 'Traverse', '唯一無二のステージを体感せよ！', false, '野外ステージ', '【２日目】 12:45～13:05', 415),
('ousia', 'stage', 'Ousia', '心を揺さぶるパフォーマンス！', false, '野外ステージ', '【２日目】 14:05～14:30', 416),
('milky', 'stage', 'Milky♡', '講堂を沸かせる最高のステージ！', false, '講堂ステージ', '【２日目】 14:15～14:30', 417)
ON CONFLICT DO NOTHING;

-- Init Congestion for projects
INSERT INTO public.congestion (project_id, level) 
SELECT project_id, 1 FROM public.projects p
WHERE NOT EXISTS (
    SELECT 1 FROM public.congestion c WHERE c.project_id = p.project_id
);
