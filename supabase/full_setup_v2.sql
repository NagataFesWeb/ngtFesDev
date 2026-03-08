-- =============================================================================
-- full_setup_v2.sql
-- NagatestFes 初期構築用 統合SQLスクリプト（投票機能なし）
--
-- 統合元ファイル（15件）:
--   20251231190000_init_schema.sql
--   20251231203000_add_user_trigger.sql
--   20251231204000_update_quiz_rpc.sql
--   20251231205000_add_quiz_ranking_rpc.sql
--   20260101000000_fix_operator_and_storage.sql
--   20260101010000_admin_features.sql
--   20260101020000_admin_fastpass.sql
--   20260102120000_enforce_feature_toggles.sql
--   20260103100000_add_wait_time.sql
--   20260103103000_add_list_rpc.sql
--   20260103110000_update_ranking_rpc.sql
--   20260103120000_create_news_table.sql
--   20260103130000_fix_news_and_schema.sql
--   20260103140000_add_more_seed_data.sql
--   20260205190000_remove_voting_feature.sql
--
-- ※ 投票機能（votes テーブル、cast_vote、admin_get_vote_summary 等）は
--    完全に除外されています。
-- =============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================================
-- SECTION 1: ヘルパー関数（テーブル作成前に定義）
-- =============================================================================

-- 1.1 is_admin() ヘルパー関数
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE user_id = auth.uid()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1.2 updated_at 自動更新トリガー関数
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';


-- =============================================================================
-- SECTION 2: テーブル作成
-- =============================================================================

-- 2.1 users（訪問者管理）
CREATE TABLE IF NOT EXISTS public.users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_user_id TEXT UNIQUE,
    display_name TEXT DEFAULT 'Guest',
    role TEXT DEFAULT 'guest' CHECK (role IN ('guest', 'admin')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.2 classes（クラス認証）
CREATE TABLE IF NOT EXISTS public.classes (
    class_id TEXT PRIMARY KEY, -- e.g. "1-1"
    class_name TEXT NOT NULL,
    password_hash TEXT NOT NULL
);

-- 2.3 projects（展示・企画マスタ）
CREATE TABLE IF NOT EXISTS public.projects (
    project_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id TEXT REFERENCES public.classes(class_id),
    type TEXT CHECK (type IN ('class', 'food', 'stage', 'exhibition')),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    fastpass_enabled BOOLEAN DEFAULT false,
    rotation_time_min INTEGER DEFAULT 10, -- 1グループ分の待ち時間（分）
    max_queue_size INTEGER DEFAULT 50,    -- 最大待機人数
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.4 congestion（リアルタイム混雑状況）
CREATE TABLE IF NOT EXISTS public.congestion (
    project_id UUID PRIMARY KEY REFERENCES public.projects(project_id) ON DELETE CASCADE,
    level INTEGER DEFAULT 1 CHECK (level BETWEEN 1 AND 3),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.5 fastpass_slots（ファストパス枠）
CREATE TABLE IF NOT EXISTS public.fastpass_slots (
    slot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(project_id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    capacity INTEGER DEFAULT 0 CHECK (capacity >= 0)
);

-- 2.6 fastpass_tickets（ファストパスチケット）
CREATE TABLE IF NOT EXISTS public.fastpass_tickets (
    ticket_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id UUID REFERENCES public.fastpass_slots(slot_id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
    qr_token TEXT NOT NULL UNIQUE,
    used BOOLEAN DEFAULT false,
    issued_at TIMESTAMPTZ DEFAULT now()
);

-- 2.7 quiz_questions（クイズ問題）
CREATE TABLE IF NOT EXISTS public.quiz_questions (
    question_id SERIAL PRIMARY KEY,
    question_text TEXT NOT NULL,
    choices JSONB NOT NULL, -- ["A", "B", "C", "D"]
    correct_choice_index INTEGER NOT NULL CHECK (correct_choice_index BETWEEN 0 AND 3)
);

-- 2.8 quiz_sessions（クイズセッション）
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE,
    questions JSONB NOT NULL,       -- Array of question_ids
    correct_answers JSONB NOT NULL, -- Map { q_id: correct_index }
    expires_at TIMESTAMPTZ NOT NULL
);

-- 2.9 quiz_scores（クイズスコア）
CREATE TABLE IF NOT EXISTS public.quiz_scores (
    user_id UUID PRIMARY KEY REFERENCES public.users(user_id) ON DELETE CASCADE,
    highest_score INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    play_count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.10 operation_logs（操作ログ）
CREATE TABLE IF NOT EXISTS public.operation_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id TEXT, -- class_id or admin_id
    action TEXT NOT NULL,
    details JSONB,
    performed_at TIMESTAMPTZ DEFAULT now()
);

-- 2.11 system_settings（システム設定・機能トグル）
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.12 news（お知らせ）
CREATE TABLE IF NOT EXISTS public.news (
    news_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    is_important BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- news テーブルのコメント（スキーマキャッシュ更新用）
COMMENT ON TABLE public.news IS 'News items for the top page';


-- =============================================================================
-- SECTION 3: RLS（Row Level Security）
-- =============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.congestion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fastpass_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fastpass_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- パブリック読み取りポリシー
CREATE POLICY "Public can view projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Public can view congestion" ON public.congestion FOR SELECT USING (true);
CREATE POLICY "Public can view fastpass_slots" ON public.fastpass_slots FOR SELECT USING (true);
CREATE POLICY "Public can view quiz_questions" ON public.quiz_questions FOR SELECT USING (true);

-- ユーザーポリシー
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own display_name" ON public.users FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can view own tickets" ON public.fastpass_tickets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can view own quiz scores" ON public.quiz_scores FOR SELECT USING (user_id = auth.uid());

-- 管理者ポリシー
CREATE POLICY "Admins can view logs" ON public.operation_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid() AND role = 'admin')
);

-- system_settings ポリシー
CREATE POLICY "Admins can do everything on system_settings"
    ON public.system_settings
    FOR ALL
    USING (public.is_admin());

CREATE POLICY "Everyone can view system_settings"
    ON public.system_settings
    FOR SELECT
    USING (true);

-- news ポリシー
DROP POLICY IF EXISTS "Public can view active news" ON public.news;
DROP POLICY IF EXISTS "Admins can manage news" ON public.news;

CREATE POLICY "Public can view active news" ON public.news
    FOR SELECT TO public
    USING (is_active = true);

CREATE POLICY "Admins can manage news" ON public.news
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());


-- =============================================================================
-- SECTION 4: トリガー
-- =============================================================================

-- 4.1 auth.users へのサインアップ時に public.users へ自動挿入
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (user_id, display_name)
    VALUES (new.id, new.raw_user_meta_data->>'full_name');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4.2 news の updated_at 自動更新トリガー
DROP TRIGGER IF EXISTS update_news_modtime ON public.news;
CREATE TRIGGER update_news_modtime
    BEFORE UPDATE ON public.news
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


-- =============================================================================
-- SECTION 5: RPC 関数（認証・オペレーター系）
-- =============================================================================

-- 5.1 オペレーターログイン（project_id 付き）
CREATE OR REPLACE FUNCTION public.operator_login(p_class_id TEXT, p_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_class_name TEXT;
    v_password_hash TEXT;
    v_project_id UUID;
BEGIN
    SELECT class_name, password_hash INTO v_class_name, v_password_hash
    FROM public.classes
    WHERE class_id = p_class_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 401, 'message', 'Invalid class ID');
    END IF;

    IF v_password_hash != p_password THEN
         RETURN jsonb_build_object('status', 401, 'message', 'Invalid password');
    END IF;

    -- Project ID を取得
    SELECT project_id INTO v_project_id FROM public.projects WHERE class_id = p_class_id;

    RETURN jsonb_build_object(
        'status', 'success',
        'token', p_class_id,
        'class_name', v_class_name,
        'project_id', v_project_id
    );
END;
$$;

-- 5.2 オペレーター：プロジェクト情報更新
CREATE OR REPLACE FUNCTION public.operator_update_project(p_operator_token TEXT, p_description TEXT, p_image_url TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_class_id TEXT;
    v_project_id UUID;
BEGIN
    v_class_id := p_operator_token;
    PERFORM 1 FROM public.classes WHERE class_id = v_class_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('status', 401); END IF;

    UPDATE public.projects
    SET
        description = COALESCE(p_description, description),
        image_url = COALESCE(p_image_url, image_url)
    WHERE class_id = v_class_id;

    RETURN jsonb_build_object('status', 'success');
END;
$$;

-- 5.3 オペレーター：混雑度更新（レートリミット付き）
CREATE OR REPLACE FUNCTION public.operator_update_congestion(p_operator_token TEXT, p_level INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_class_id TEXT;
    v_project_id UUID;
    v_last_updated TIMESTAMPTZ;
BEGIN
    v_class_id := p_operator_token;
    PERFORM 1 FROM public.classes WHERE class_id = v_class_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('status', 401); END IF;

    SELECT project_id INTO v_project_id FROM public.projects WHERE class_id = v_class_id;
    IF v_project_id IS NULL THEN RETURN jsonb_build_object('status', 404, 'message', 'Project not found'); END IF;

    -- レートリミット（30秒）
    SELECT updated_at INTO v_last_updated FROM public.congestion WHERE project_id = v_project_id;
    IF v_last_updated IS NOT NULL AND now() < v_last_updated + interval '30 seconds' THEN
        RETURN jsonb_build_object('status', 429, 'code', 'RATE_LIMIT_EXCEEDED');
    END IF;

    INSERT INTO public.congestion (project_id, level, updated_at)
    VALUES (v_project_id, p_level, now())
    ON CONFLICT (project_id) DO UPDATE SET level = EXCLUDED.level, updated_at = now();

    RETURN jsonb_build_object('status', 'updated', 'new_level', p_level);
END;
$$;


-- =============================================================================
-- SECTION 6: RPC 関数（ファストパス系）
-- =============================================================================

-- 6.1 ファストパスチケット発行（機能トグル対応済み）
CREATE OR REPLACE FUNCTION public.issue_fastpass_ticket(p_slot_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_capacity INTEGER;
    v_count INTEGER;
    v_ticket_id UUID;
    v_enabled BOOLEAN;
BEGIN
    -- 機能トグルチェック
    SELECT (value::text = 'true') INTO v_enabled
    FROM public.system_settings
    WHERE key = 'fastpass_enabled';

    IF v_enabled IS FALSE THEN
        RETURN jsonb_build_object('status', 403, 'message', 'FastPass issuance is currently disabled');
    END IF;

    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 既存の未使用チケット確認
    PERFORM 1 FROM public.fastpass_tickets
    WHERE user_id = v_user_id AND used = false
    FOR UPDATE;

    IF FOUND THEN
        RETURN jsonb_build_object('status', 409, 'code', 'ALREADY_HAS_TICKET');
    END IF;

    -- 枠の残量確認
    SELECT capacity INTO v_capacity FROM public.fastpass_slots WHERE slot_id = p_slot_id FOR UPDATE;
    SELECT count(*) INTO v_count FROM public.fastpass_tickets WHERE slot_id = p_slot_id;

    IF v_count >= v_capacity THEN
        RETURN jsonb_build_object('status', 409, 'code', 'SLOT_FULL');
    END IF;

    -- チケット発行
    INSERT INTO public.fastpass_tickets (slot_id, user_id, qr_token)
    VALUES (p_slot_id, v_user_id, gen_random_uuid()::text)
    RETURNING ticket_id INTO v_ticket_id;

    RETURN jsonb_build_object('status', 'success', 'ticket_id', v_ticket_id);
END;
$$;

-- 6.2 ファストパスチケット検証・使用
CREATE OR REPLACE FUNCTION public.verify_and_use_ticket(p_qr_token TEXT, p_operator_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_class_id TEXT;
    v_ticket RECORD;
BEGIN
    -- オペレーター認証
    v_class_id := p_operator_token;
    PERFORM 1 FROM public.classes WHERE class_id = v_class_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 401, 'message', 'Invalid operator');
    END IF;

    -- チケット検索
    SELECT t.*, s.start_time, s.end_time, p.title, p.class_id AS project_class_id
    INTO v_ticket
    FROM public.fastpass_tickets t
    JOIN public.fastpass_slots s ON t.slot_id = s.slot_id
    JOIN public.projects p ON s.project_id = p.project_id
    WHERE t.qr_token = p_qr_token;

    IF v_ticket IS NULL THEN
         RETURN jsonb_build_object('status', 404, 'message', 'Ticket not found');
    END IF;

    IF v_ticket.used THEN
        RETURN jsonb_build_object('status', 400, 'code', 'ALREADY_USED');
    END IF;

    -- クラス一致確認
    IF v_ticket.project_class_id != v_class_id THEN
        RETURN jsonb_build_object('status', 403, 'message', 'Class mismatch');
    END IF;

    -- 使用済みにマーク
    UPDATE public.fastpass_tickets SET used = true WHERE ticket_id = v_ticket.ticket_id;

    RETURN jsonb_build_object('status', 'ok', 'project_title', v_ticket.title);
END;
$$;


-- =============================================================================
-- SECTION 7: RPC 関数（クイズ系）
-- =============================================================================

-- 7.1 クイズスコア提出（機能トグル対応済み）
CREATE OR REPLACE FUNCTION public.submit_quiz_score(p_answers JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_total_score INTEGER := 0;
    v_correct_count INTEGER := 0;
    v_question RECORD;
    v_answer_record RECORD;
    v_user_answer INTEGER;
    v_enabled BOOLEAN;
BEGIN
    -- 機能トグルチェック
    SELECT (value::text = 'true') INTO v_enabled
    FROM public.system_settings
    WHERE key = 'quiz_enabled';

    IF v_enabled IS FALSE THEN
         RETURN jsonb_build_object(
            'status', 'error',
            'message', 'Quiz is currently disabled'
        );
    END IF;

    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
         RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 回答を1件ずつ採点
    FOR v_answer_record IN SELECT * FROM jsonb_each_text(p_answers)
    LOOP
        SELECT correct_choice_index INTO v_question
        FROM public.quiz_questions
        WHERE question_id = v_answer_record.key::INTEGER;

        IF FOUND THEN
            v_user_answer := v_answer_record.value::INTEGER;
            IF v_question.correct_choice_index = v_user_answer THEN
                v_total_score := v_total_score + 10;
                v_correct_count := v_correct_count + 1;
            END IF;
        END IF;
    END LOOP;

    -- スコアをアップサート
    INSERT INTO public.quiz_scores (user_id, highest_score, total_score, play_count, updated_at)
    VALUES (v_user_id, v_total_score, v_total_score, 1, now())
    ON CONFLICT (user_id) DO UPDATE SET
        highest_score = GREATEST(public.quiz_scores.highest_score, EXCLUDED.highest_score),
        total_score = public.quiz_scores.total_score + EXCLUDED.total_score,
        play_count = public.quiz_scores.play_count + 1,
        updated_at = now();

    RETURN jsonb_build_object(
        'score', v_total_score,
        'correct_count', v_correct_count,
        'status', 'success'
    );
END;
$$;

-- 7.2 クイズランキング取得（total_score 順）
CREATE OR REPLACE FUNCTION public.get_quiz_ranking()
RETURNS TABLE (
    display_name TEXT,
    highest_score INTEGER,
    total_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.display_name,
        qs.highest_score,
        qs.total_score
    FROM public.quiz_scores qs
    JOIN public.users u ON qs.user_id = u.user_id
    ORDER BY qs.total_score DESC, qs.highest_score DESC
    LIMIT 10;
END;
$$;


-- =============================================================================
-- SECTION 8: RPC 関数（待ち時間・プロジェクト一覧）
-- =============================================================================

-- 8.1 推定待ち時間計算
CREATE OR REPLACE FUNCTION public.get_estimated_wait_time(p_project_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_level INTEGER;
    v_max_queue INTEGER;
    v_rotation_time INTEGER;
    v_estimated_queue INTEGER;
    v_fastpass_count INTEGER;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- 1. 混雑レベル取得
    SELECT level INTO v_level FROM public.congestion WHERE project_id = p_project_id;
    IF v_level IS NULL THEN v_level := 1; END IF;

    -- 2. プロジェクト設定取得
    SELECT max_queue_size, rotation_time_min
    INTO v_max_queue, v_rotation_time
    FROM public.projects
    WHERE project_id = p_project_id;

    IF v_max_queue IS NULL THEN v_max_queue := 50; END IF;
    IF v_rotation_time IS NULL THEN v_rotation_time := 10; END IF;

    -- 3. 混雑レベルに基づく推定待機人数
    -- LVL1: ~10%  LVL2: ~50%  LVL3: ~90%
    IF v_level = 1 THEN
        v_estimated_queue := v_max_queue * 0.1;
    ELSIF v_level = 2 THEN
        v_estimated_queue := v_max_queue * 0.5;
    ELSE
        v_estimated_queue := v_max_queue * 0.9;
    END IF;

    -- 4. 現在枠の未使用ファストパス数
    SELECT COUNT(*) INTO v_fastpass_count
    FROM public.fastpass_tickets t
    JOIN public.fastpass_slots s ON t.slot_id = s.slot_id
    WHERE s.project_id = p_project_id
    AND s.start_time <= v_now
    AND s.end_time > v_now
    AND t.used = false;

    IF v_fastpass_count IS NULL THEN v_fastpass_count := 0; END IF;

    -- 5. 推定待ち時間 = (推定待機人数 + ファストパス数) × 回転時間
    RETURN (v_estimated_queue + v_fastpass_count) * v_rotation_time;
END;
$$;

-- 8.2 混雑状況＋待ち時間付きプロジェクト一覧
CREATE OR REPLACE FUNCTION public.get_projects_with_status()
RETURNS TABLE (
    project_id UUID,
    class_id TEXT,
    type TEXT,
    title TEXT,
    description TEXT,
    image_url TEXT,
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
        p.fastpass_enabled,
        COALESCE(c.level, 1) as congestion_level,
        public.get_estimated_wait_time(p.project_id) as wait_time_min
    FROM public.projects p
    LEFT JOIN public.congestion c ON p.project_id = c.project_id
    ORDER BY p.class_id;
END;
$$;


-- =============================================================================
-- SECTION 9: RPC 関数（管理者系）
-- =============================================================================

-- 9.1 管理者：混雑度更新
CREATE OR REPLACE FUNCTION public.admin_update_congestion(p_project_id UUID, p_level INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM public.users WHERE user_id = auth.uid();
    IF v_role IS DISTINCT FROM 'admin' THEN
        RETURN jsonb_build_object('status', 403, 'message', 'Forbidden');
    END IF;

    UPDATE public.congestion
    SET level = p_level, updated_at = now()
    WHERE project_id = p_project_id;

    INSERT INTO public.operation_logs (operator_id, action, details)
    VALUES (auth.uid()::text, 'admin_update_congestion', jsonb_build_object('project_id', p_project_id, 'level', p_level));

    RETURN jsonb_build_object('status', 'success');
END;
$$;

-- 9.2 管理者：全データリセット（投票関連ロジック除外済み）
CREATE OR REPLACE FUNCTION public.admin_reset_all_data(p_target_table TEXT, p_confirmation TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM public.users WHERE user_id = auth.uid();
    IF v_role IS DISTINCT FROM 'admin' THEN
        RETURN jsonb_build_object('status', 403, 'message', 'Forbidden');
    END IF;

    IF p_confirmation != 'RESET 2026' THEN
         RETURN jsonb_build_object('status', 400, 'message', 'Invalid confirmation');
    END IF;

    IF p_target_table = 'all' THEN
        DELETE FROM public.quiz_sessions;
        DELETE FROM public.quiz_scores;
    END IF;

    IF p_target_table = 'all' OR p_target_table = 'fastpass' THEN
         DELETE FROM public.fastpass_tickets;
         DELETE FROM public.fastpass_slots;
    END IF;

    IF p_target_table = 'all' OR p_target_table = 'users' THEN
         DELETE FROM public.users WHERE role = 'guest';
    END IF;

    INSERT INTO public.operation_logs (operator_id, action, details)
    VALUES (auth.uid()::text, 'admin_reset_all_data', jsonb_build_object('target', p_target_table));

    RETURN jsonb_build_object('status', 'success');
END;
$$;

-- 9.3 管理者：全プロジェクト混雑状況一覧
CREATE OR REPLACE FUNCTION public.admin_get_projects_status()
RETURNS TABLE (
    project_id UUID,
    title TEXT,
    class_name TEXT,
    congestion_level INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT
        p.project_id,
        p.title,
        c.class_name,
        COALESCE(cg.level, 1) as congestion_level,
        cg.updated_at
    FROM public.projects p
    JOIN public.classes c ON p.class_id = c.class_id
    LEFT JOIN public.congestion cg ON p.project_id = cg.project_id
    ORDER BY c.class_name;
$$;

-- 9.4 管理者：システム設定更新
CREATE OR REPLACE FUNCTION public.admin_update_setting(p_key TEXT, p_value JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('status', 403, 'message', 'Forbidden');
    END IF;

    UPDATE public.system_settings
    SET value = p_value, updated_at = NOW()
    WHERE key = p_key;

    RETURN jsonb_build_object('status', 'success', 'key', p_key, 'value', p_value);
END;
$$;

-- 9.5 管理者：ファストパスプロジェクト一覧
CREATE OR REPLACE FUNCTION public.admin_get_fastpass_projects()
RETURNS TABLE (
    project_id UUID,
    title TEXT,
    class_name TEXT,
    fastpass_enabled BOOLEAN,
    total_slots INTEGER,
    total_issued INTEGER
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT
        p.project_id,
        p.title,
        c.class_name,
        p.fastpass_enabled,
        (SELECT count(*) FROM public.fastpass_slots s WHERE s.project_id = p.project_id)::INTEGER as total_slots,
        (SELECT count(*) FROM public.fastpass_tickets t JOIN public.fastpass_slots s ON t.slot_id = s.slot_id WHERE s.project_id = p.project_id)::INTEGER as total_issued
    FROM public.projects p
    LEFT JOIN public.classes c ON p.class_id = c.class_id
    ORDER BY c.class_name;
$$;

-- 9.6 管理者：プロジェクトのスロット一覧
CREATE OR REPLACE FUNCTION public.admin_get_project_slots(p_project_id UUID)
RETURNS TABLE (
    slot_id UUID,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    capacity INTEGER,
    issued_count INTEGER
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT
        s.slot_id,
        s.start_time,
        s.end_time,
        s.capacity,
        (SELECT count(*)::int FROM public.fastpass_tickets t WHERE t.slot_id = s.slot_id) as issued_count
    FROM public.fastpass_slots s
    WHERE s.project_id = p_project_id
    ORDER BY s.start_time;
$$;

-- 9.7 管理者：スロット容量更新
CREATE OR REPLACE FUNCTION public.admin_update_slot_capacity(p_slot_id UUID, p_capacity INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_project_id UUID;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('status', 403, 'message', 'Forbidden');
    END IF;

    UPDATE public.fastpass_slots
    SET capacity = p_capacity
    WHERE slot_id = p_slot_id
    RETURNING project_id INTO v_project_id;

    INSERT INTO public.operation_logs (operator_id, action, details)
    VALUES (
        auth.uid()::text,
        'admin_update_slot_capacity',
        jsonb_build_object('slot_id', p_slot_id, 'capacity', p_capacity, 'project_id', v_project_id)
    );

    RETURN jsonb_build_object('status', 'success');
END;
$$;

-- 9.8 管理者：プロジェクトのファストパス有効/無効切替
CREATE OR REPLACE FUNCTION public.admin_toggle_project_fastpass(p_project_id UUID, p_enabled BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('status', 403, 'message', 'Forbidden');
    END IF;

    UPDATE public.projects
    SET fastpass_enabled = p_enabled
    WHERE project_id = p_project_id;

    INSERT INTO public.operation_logs (operator_id, action, details)
    VALUES (
        auth.uid()::text,
        'admin_toggle_project_fastpass',
        jsonb_build_object('project_id', p_project_id, 'enabled', p_enabled)
    );

    RETURN jsonb_build_object('status', 'success');
END;
$$;


-- =============================================================================
-- SECTION 10: ストレージ設定
-- =============================================================================

-- project-images バケット作成（権限エラーは無視）
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('project-images', 'project-images', true)
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'project-images' );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'project-images' );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- =============================================================================
-- SECTION 11: 初期データ（シードデータ）
-- =============================================================================

-- 11.1 システム設定（投票機能は除外）
INSERT INTO public.system_settings (key, value, description) VALUES
('quiz_enabled',     'true'::jsonb, 'Enable or disable quiz feature'),
('fastpass_enabled', 'true'::jsonb, 'Enable or disable fastpass issuance')
ON CONFLICT (key) DO NOTHING;

-- 11.2 クラスデータ（2年・3年）
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

-- 11.3 プロジェクトデータ
INSERT INTO public.projects (class_id, type, title, description, fastpass_enabled, image_url) VALUES
-- 2年：クラス展示
('2-1', 'class', 'VS 2-1',       '2-1のVSパークへようこそ！',     true,  NULL),
('2-2', 'class', 'Haunted 2-2',  '最恐のお化け屋敷',              false, NULL),
('2-3', 'class', 'Casino 2-3',   '大人の社交場カジノ',            true,  NULL),
('2-4', 'class', 'Maze 2-4',     '脱出不可能迷路',                false, NULL),
('2-5', 'class', 'Cinema 2-5',   '自作映画上映',                  true,  NULL),
('2-6', 'class', 'Photo 2-6',    '映えスポット写真館',            false, NULL),
('2-7', 'class', 'Coffee 2-7',   '喫茶店 (展示)',                  true,  NULL),
('2-8', 'class', 'Game 2-8',     'レトロゲームセンター',          false, NULL),
-- 3年：フード
('3-2', 'food',  '3-2 Curry',    'スパイスから作ったカレー',      true,  NULL),
('3-3', 'food',  '3-3 Crepe',    '甘くて美味しいクレープ',        true,  NULL),
('3-4', 'food',  '3-4 Frankfurt','アツアツフランクフルト',        false, NULL),
('3-5', 'food',  '3-5 Tapioca',  'タピオカドリンク専門店',        true,  NULL),
('3-6', 'food',  '3-6 Burger',   '特製ハンバーガー',              true,  NULL),
('3-7', 'food',  '3-7 Udon',     '手打ちうどん',                  false, NULL),
('3-8', 'food',  '3-8 Ice',      'サーティワンアイスクリーム',    true,  NULL)
ON CONFLICT DO NOTHING;

-- 11.4 全プロジェクトの混雑度初期値（レベル1）
INSERT INTO public.congestion (project_id, level)
SELECT p.project_id, 1
FROM public.projects p
WHERE NOT EXISTS (
    SELECT 1 FROM public.congestion c WHERE c.project_id = p.project_id
);


-- 11.5 追加のシードデータ (from seed.sql)
-- Classes
INSERT INTO public.classes (class_id, class_name, password_hash) VALUES
('1-1', '1年1組', 'pass11'),
('3-1', '3年1組', 'pass31')
ON CONFLICT (class_id) DO NOTHING;

-- Projects
INSERT INTO public.projects (class_id, type, title, description, fastpass_enabled) VALUES
('1-1', 'exhibition', '1-1 Exhibition', 'Great exhibition', false),
('3-1', 'food', '3-1 Yakisoba', 'Delicious yakisoba', true)
ON CONFLICT DO NOTHING;

-- Init Congestion for projects
INSERT INTO public.congestion (project_id, level) 
SELECT project_id, 1 FROM public.projects p
WHERE NOT EXISTS (
    SELECT 1 FROM public.congestion c WHERE c.project_id = p.project_id
);

-- Quiz Questions
INSERT INTO public.quiz_questions (question_text, choices, correct_choice_index) VALUES
('長田高校の創立年は？', '["1918", "1920", "1921", "1945"]'::jsonb, 1),
('文化祭の名前は？', '["長田フェス", "文化祭", "神撫祭", "体育祭"]'::jsonb, 0)
ON CONFLICT DO NOTHING;


-- 11.6 ファストパルスロットの自動生成 (from seed_slots.sql)
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


-- =============================================================================
-- END OF full_setup_v2.sql
-- =============================================================================
