-- Migration for Nagata Quiz Feature (Client-side grading)

-- 1. 不要になった古いクイズテーブル（セッション管理）を削除・整理
DROP TABLE IF EXISTS public.quiz_sessions;

-- 念の為 quiz_questions の存在確認と整理
-- correct_choice_index がある前提（init_schema に定義あり）ですが、もし無ければ追加します。
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='quiz_questions' AND column_name='correct_choice_index'
    ) THEN
        ALTER TABLE public.quiz_questions ADD COLUMN correct_choice_index INTEGER NOT NULL DEFAULT 0 CHECK (correct_choice_index BETWEEN 0 AND 3);
    END IF;
END $$;

-- 2. get_quiz_questions の作成 (ランダム出題＆ハッシュ化正解)
-- API Route側と同じソルト(SERVER_SECRETの代わり、または固定ソルト)を使用して正解をハッシュ化します。
-- ※ 一旦フロントエンドで検証しやすいよう、ここではシンプルなソルト ('NgtFes26_Quiz_Salt') を用いてSHA256ハッシュを作ります。
CREATE OR REPLACE FUNCTION public.get_quiz_questions()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_salt TEXT := 'NgtFes26_Quiz_Salt';
    v_questions JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'q_id', question_id,
            'text', question_text,
            'choices', choices,
            -- 正解のインデックス番号を文字列化してソルトと結合しハッシュ化
            'correct_hash', encode(digest(question_id::text || correct_choice_index::text || v_salt, 'sha256'), 'hex')
        )
    )
    INTO v_questions
    FROM (
        SELECT * FROM public.quiz_questions
        ORDER BY random()
        LIMIT 10
    ) q;

    RETURN coalesce(v_questions, '[]');
END;
$$;

-- 3. submit_quiz_score の作成 (Rate Limiting と Signature Verification)
CREATE OR REPLACE FUNCTION public.submit_quiz_score(p_score INTEGER, p_signature TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_server_secret TEXT := 'NgtFes26_Super_Secret_Key'; -- 運用時は環境変数等から参照すべきだが簡易化
    v_expected_signature TEXT;
    v_last_played TIMESTAMPTZ;
    v_current_total INTEGER;
    v_current_highest INTEGER;
    v_current_play_count INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- パラメータバリデーション
    IF p_score < 0 OR p_score > 10 THEN
        RETURN jsonb_build_object('status', 400, 'message', 'Invalid score');
    END IF;

    -- 1. シグネチャの検証 (HMAC-SHA256)
    -- p_signature はフロント(またはAPI Route)で user_id と score を元に生成された想定
    v_expected_signature := encode(hmac(v_user_id::text || p_score::text, v_server_secret, 'sha256'), 'hex');
    IF p_signature != v_expected_signature THEN
        RETURN jsonb_build_object('status', 403, 'message', 'Invalid signature');
    END IF;

    -- 2. Rate Limiting チェック
    SELECT updated_at INTO v_last_played FROM public.quiz_scores WHERE user_id = v_user_id;
    IF FOUND AND v_last_played > now() - interval '1 minute' THEN
        RETURN jsonb_build_object('status', 429, 'message', 'Please wait before playing again');
    END IF;

    -- 3. スコアの更新 (UPSERT)
    INSERT INTO public.quiz_scores (user_id, highest_score, total_score, play_count, updated_at)
    VALUES (v_user_id, p_score, p_score, 1, now())
    ON CONFLICT (user_id) DO UPDATE 
    SET 
        highest_score = GREATEST(quiz_scores.highest_score, EXCLUDED.highest_score),
        total_score = quiz_scores.total_score + EXCLUDED.total_score,
        play_count = quiz_scores.play_count + 1,
        updated_at = now()
    RETURNING total_score, highest_score, play_count 
    INTO v_current_total, v_current_highest, v_current_play_count;

    RETURN jsonb_build_object(
        'status', 'success',
        'score', p_score,
        'total_score', v_current_total,
        'highest_score', v_current_highest,
        'play_count', v_current_play_count
    );
END;
$$;


-- 4. ダミー問題のインサート (全12問)
-- TRUNCATE してから入れ直す（既存の2問がある想定対応）
TRUNCATE TABLE public.quiz_questions RESTART IDENTITY;

INSERT INTO public.quiz_questions (question_text, choices, correct_choice_index) VALUES 
('長田高校の創立年はいつでしょうか？', '["1918年", "1920年", "1921年", "1945年"]'::jsonb, 2),
('長田高校の校訓として正しいものはどれ？', '["自主・自律", "質実剛健", "文武両道", "神武不殺"]'::jsonb, 0),
('長田高校の象徴的な建物である「神撫台（しんぶだい）」の由来は？', '["近くの山の名前", "創立者の名前", "地元の神社の名前", "神戸の古い地名"]'::jsonb, 0),
('長田高校の制服（冬服）の特徴的な色は？', '["ネイビーブルー", "チャコールグレー", "ブラック", "ダークグリーン"]'::jsonb, 0),
('長田祭（文化祭）の通例の開催時期は？', '["4月上旬", "6月中旬", "9月上旬", "11月下旬"]'::jsonb, 1),
('長田高校の生徒会にあたる組織の名称は？', '["自治会", "生徒協議会", "学友会", "中央委員会"]'::jsonb, 0),
('長田高校の校章にデザインされている植物は？', '["桜", "梅", "松", "菊"]'::jsonb, 2),
('長田高校のグラウンドの特徴は？', '["全面人工芝", "非常に広い土のグラウンド", "地下にある", "陸上トラックが青色"]'::jsonb, 1),
('長田高校の最寄りの鉄道駅はどれ？', '["長田駅", "高速長田駅", "板宿駅", "新長田駅"]'::jsonb, 1),
('長田高校の部活動で、全国大会の常連として有名な文化部は？', '["吹奏楽部", "音楽部(合唱)", "演劇部", "書道部"]'::jsonb, 1),
('長田高校周辺で人気のご当地グルメはどれ？', '["そばめし", "明石焼き", "神戸牛バーガー", "豚まん"]'::jsonb, 0),
('長田高校の生徒手帳の表紙の色は？', '["えんじ色", "紺色", "黒色", "深緑色"]'::jsonb, 0);
