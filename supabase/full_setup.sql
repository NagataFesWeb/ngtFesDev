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
--   20260305132452_add_nagata_quiz_feature.sql
--   20260305194836_update_users_table.sql
--   20260305225400_add_quiz_ranking.sql
--   20260305234800_add_quiz_rewards.sql
--   20260306214500_add_operator_edit_setting.sql
--   20260306214700_remove_voting_setting.sql
--   20260402120000_fastpass_festival_news_sales.sql
--   20260403120000_fastpass_expiry_at_end_time.sql
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
    login_id TEXT UNIQUE NOT NULL,
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
    location TEXT,
    schedule TEXT,
    fastpass_enabled BOOLEAN DEFAULT false,
    rotation_time_min INTEGER DEFAULT 10, -- 1グループ分の待ち時間（分）
    max_queue_size INTEGER DEFAULT 50,    -- 最大待機人数
    sort_order INTEGER,                   -- 表示順序
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
    capacity INTEGER DEFAULT 0 CHECK (capacity >= 0),
    festival_day TEXT NOT NULL DEFAULT 'school' CHECK (festival_day IN ('school', 'public'))
);

COMMENT ON COLUMN public.fastpass_slots.festival_day IS 'school=校内祭日, public=一般祭日';

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

-- 2.8 quiz_rewards（クイズ報酬）
CREATE TABLE IF NOT EXISTS public.quiz_rewards (
    id SERIAL PRIMARY KEY,
    required_score INTEGER NOT NULL,
    title_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_required_score UNIQUE (required_score)
);

-- 2.9 quiz_scores（クイズスコア）
CREATE TABLE IF NOT EXISTS public.quiz_scores (
    user_id UUID PRIMARY KEY REFERENCES public.users(user_id) ON DELETE CASCADE,
    highest_score INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    play_count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quiz_scores_total_score ON public.quiz_scores(total_score DESC);

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
    title TEXT NOT NULL DEFAULT '',
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
ALTER TABLE public.quiz_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- パブリック読み取りポリシー
CREATE POLICY "Public can view projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Public can view congestion" ON public.congestion FOR SELECT USING (true);
CREATE POLICY "Public can view fastpass_slots" ON public.fastpass_slots FOR SELECT USING (true);
CREATE POLICY "Public can view quiz_questions" ON public.quiz_questions FOR SELECT USING (true);
CREATE POLICY "Allow read for all authenticated users" ON public.quiz_rewards FOR SELECT TO authenticated USING (true);

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
RETURNS trigger AS $$
DECLARE
  v_login_id TEXT;
  v_display_name TEXT;
BEGIN
  -- raw_user_meta_data から login_id を取得するか、email の @ より前を利用する
  v_login_id := coalesce(
    new.raw_user_meta_data->>'login_id',
    split_part(new.email, '@', 1)
  );

  -- 空チェック
  IF v_login_id IS NULL OR length(trim(v_login_id)) = 0 THEN
    v_login_id := 'guest_' || substr(gen_random_uuid()::text, 1, 8);
  END IF;

  v_display_name := coalesce(new.raw_user_meta_data->>'full_name', 'Guest');

  INSERT INTO public.users (user_id, login_id, display_name)
  VALUES (
    new.id, 
    v_login_id,
    v_display_name
  );
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in handle_new_user. user_id: %, login_id: %, Error: %', new.id, v_login_id, SQLERRM;
  RAISE;
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
CREATE OR REPLACE FUNCTION public.operator_update_project(p_operator_token TEXT, p_title TEXT, p_description TEXT, p_image_url TEXT)
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
        title = COALESCE(p_title, title),
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

-- 6.0 祭日ごとの販売オープン判定（内部用）
CREATE OR REPLACE FUNCTION public._fastpass_sales_open_for_day(p_day TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_key_t TEXT;
    v_key_at TEXT;
    v_toggle JSONB;
    v_at JSONB;
    v_toggle_on BOOLEAN := false;
    v_scheduled_ok BOOLEAN := false;
BEGIN
    IF p_day = 'school' THEN
        v_key_t := 'fastpass_sale_school_toggle';
        v_key_at := 'fastpass_sale_school_opens_at';
    ELSIF p_day = 'public' THEN
        v_key_t := 'fastpass_sale_public_toggle';
        v_key_at := 'fastpass_sale_public_opens_at';
    ELSE
        RETURN false;
    END IF;

    SELECT value INTO v_toggle FROM public.system_settings WHERE key = v_key_t;
    v_toggle_on := COALESCE(v_toggle = 'true'::jsonb, false);

    SELECT value INTO v_at FROM public.system_settings WHERE key = v_key_at;
    IF v_at IS NULL OR jsonb_typeof(v_at) = 'null' THEN
        v_scheduled_ok := false;
    ELSIF jsonb_typeof(v_at) = 'string' THEN
        v_scheduled_ok := (now() >= (v_at #>> '{}')::timestamptz);
    ELSE
        v_scheduled_ok := false;
    END IF;

    RETURN v_toggle_on OR v_scheduled_ok;
END;
$$;

-- 6.0b 販売状態（フロント用）
CREATE OR REPLACE FUNCTION public.get_fastpass_sales_status()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT jsonb_build_object(
        'school_open', public._fastpass_sales_open_for_day('school'),
        'public_open', public._fastpass_sales_open_for_day('public')
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_fastpass_sales_status() TO anon, authenticated;

-- 6.0c 期限切れチケットの破棄
CREATE OR REPLACE FUNCTION public.discard_expired_fastpass_ticket(p_ticket_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_deleted INT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    DELETE FROM public.fastpass_tickets t
    USING public.fastpass_slots s
    WHERE t.ticket_id = p_ticket_id
      AND t.slot_id = s.slot_id
      AND t.user_id = v_user_id
      AND t.used = false
      AND now() > s.end_time;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    IF v_deleted = 0 THEN
        RETURN jsonb_build_object('status', 400, 'code', 'CANNOT_DISCARD');
    END IF;

    RETURN jsonb_build_object('status', 'success');
END;
$$;

GRANT EXECUTE ON FUNCTION public.discard_expired_fastpass_ticket(UUID) TO authenticated;

-- 6.1 ファストパスチケット発行（機能トグル・販売開始・有効期限・祭日ごと1枚）
CREATE OR REPLACE FUNCTION public.issue_fastpass_ticket(p_slot_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_capacity INTEGER;
    v_count INTEGER;
    v_ticket_id UUID;
    v_enabled BOOLEAN;
    v_festival_day TEXT;
    v_end_time TIMESTAMPTZ;
    v_project_fp BOOLEAN;
    v_sale_open BOOLEAN;
BEGIN
    SELECT COALESCE((value = 'true'::jsonb), false)
    INTO v_enabled
    FROM public.system_settings
    WHERE key = 'fastpass_enabled';

    IF NOT FOUND OR v_enabled IS NOT TRUE THEN
        RETURN jsonb_build_object('status', 403, 'message', 'FastPass issuance is currently disabled');
    END IF;

    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT s.festival_day, s.end_time, COALESCE(p.fastpass_enabled, false)
    INTO v_festival_day, v_end_time, v_project_fp
    FROM public.fastpass_slots s
    JOIN public.projects p ON p.project_id = s.project_id
    WHERE s.slot_id = p_slot_id
    FOR UPDATE OF s;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 404, 'code', 'SLOT_NOT_FOUND');
    END IF;

    IF NOT v_project_fp THEN
        RETURN jsonb_build_object('status', 403, 'code', 'PROJECT_FP_DISABLED');
    END IF;

    IF now() > v_end_time THEN
        RETURN jsonb_build_object('status', 409, 'code', 'SLOT_EXPIRED');
    END IF;

    v_sale_open := public._fastpass_sales_open_for_day(v_festival_day);
    IF NOT v_sale_open THEN
        RETURN jsonb_build_object('status', 403, 'code', 'SALES_NOT_STARTED');
    END IF;

    PERFORM 1
    FROM public.fastpass_tickets t
    JOIN public.fastpass_slots s ON s.slot_id = t.slot_id
    WHERE t.user_id = v_user_id
      AND t.used = false
      AND s.festival_day = v_festival_day
      AND now() <= s.end_time
    FOR UPDATE OF t;

    IF FOUND THEN
        RETURN jsonb_build_object('status', 409, 'code', 'ALREADY_HAS_TICKET');
    END IF;

    SELECT capacity INTO v_capacity FROM public.fastpass_slots WHERE slot_id = p_slot_id FOR UPDATE;
    SELECT count(*)::int INTO v_count FROM public.fastpass_tickets WHERE slot_id = p_slot_id;

    IF v_count >= v_capacity THEN
        RETURN jsonb_build_object('status', 409, 'code', 'SLOT_FULL');
    END IF;

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
SET search_path = public
AS $$
DECLARE
    v_class_id TEXT;
    v_ticket RECORD;
BEGIN
    v_class_id := p_operator_token;
    PERFORM 1 FROM public.classes WHERE class_id = v_class_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 401, 'message', 'Invalid operator');
    END IF;

    SELECT t.*, s.start_time, s.end_time, p.title, p.class_id AS project_class_id
    INTO v_ticket
    FROM public.fastpass_tickets t
    JOIN public.fastpass_slots s ON t.slot_id = s.slot_id
    JOIN public.projects p ON s.project_id = p.project_id
    WHERE t.qr_token = p_qr_token;

    IF v_ticket.ticket_id IS NULL THEN
        RETURN jsonb_build_object('status', 404, 'message', 'Ticket not found');
    END IF;

    IF v_ticket.used THEN
        RETURN jsonb_build_object('status', 400, 'code', 'ALREADY_USED');
    END IF;

    IF now() > v_ticket.end_time THEN
        RETURN jsonb_build_object('status', 400, 'code', 'SLOT_EXPIRED');
    END IF;

    IF v_ticket.project_class_id != v_class_id THEN
        RETURN jsonb_build_object('status', 403, 'message', 'Class mismatch');
    END IF;

    UPDATE public.fastpass_tickets SET used = true WHERE ticket_id = v_ticket.ticket_id;

    RETURN jsonb_build_object('status', 'ok', 'project_title', v_ticket.title);
END;
$$;

-- 6.3 ファストパスチケットキャンセル
CREATE OR REPLACE FUNCTION public.cancel_fastpass_ticket(p_ticket_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_deleted INT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 自分自身の未使用かつ、開始時間前のチケットのみ削除可能
    DELETE FROM public.fastpass_tickets t
    USING public.fastpass_slots s
    WHERE t.ticket_id = p_ticket_id
      AND t.slot_id = s.slot_id
      AND t.user_id = v_user_id
      AND t.used = false
      AND now() <= s.start_time;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    IF v_deleted = 0 THEN
        RETURN jsonb_build_object('status', 400, 'code', 'CANNOT_CANCEL');
    END IF;

    RETURN jsonb_build_object('status', 'success');
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_fastpass_ticket(UUID) TO authenticated;


-- =============================================================================
-- SECTION 7: RPC 関数（クイズ系）
-- =============================================================================

-- 7.1 クイズ問題取得 (ランダム出題＆ハッシュ化正解)
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

-- 7.2 クイズスコア提出 (Rate Limiting と Signature Verification)
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

    -- パラメータバリデーション
    IF p_score < 0 OR p_score > 10 THEN
        RETURN jsonb_build_object('status', 400, 'message', 'Invalid score');
    END IF;

    -- 1. シグネチャの検証 (HMAC-SHA256)
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

-- 7.3 クイズランキング取得（total_score 順）
CREATE OR REPLACE FUNCTION public.get_quiz_ranking()
RETURNS TABLE (
    display_name TEXT,
    total_score INTEGER,
    highest_score INTEGER,
    play_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.display_name,
        qs.total_score,
        qs.highest_score,
        qs.play_count
    FROM 
        public.quiz_scores qs
    JOIN 
        public.users u ON qs.user_id = u.user_id
    ORDER BY 
        qs.total_score DESC
    LIMIT 3;
END;
$$;

-- 7.4 クイズリワードURL取得
CREATE OR REPLACE FUNCTION public.get_quiz_reward_url(p_reward_id INT)
RETURNS TABLE (
    signed_url TEXT,
    expires_in INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_total_score INT;
    v_required_score INT;
    v_storage_path TEXT;
BEGIN
    v_user_id := auth.uid();
    
    -- Get user score
    SELECT total_score INTO v_total_score FROM public.quiz_scores WHERE user_id = v_user_id;
    IF v_total_score IS NULL THEN v_total_score := 0; END IF;
    
    -- Get reward reqs
    SELECT required_score, storage_path INTO v_required_score, v_storage_path 
    FROM public.quiz_rewards WHERE id = p_reward_id;
    
    IF v_required_score IS NULL THEN
        RAISE EXCEPTION 'REWARD_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;
    
    -- Check eligibility
    IF v_total_score < v_required_score THEN
        RAISE EXCEPTION 'INSUFFICIENT_SCORE' USING ERRCODE = '42501';
    END IF;
    
    -- Return the storage_path. The client side will then call 
    -- supabase.storage.from('quiz-rewards').createSignedUrl(path, 3600).
    RETURN QUERY SELECT v_storage_path, 3600;
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
DROP FUNCTION IF EXISTS public.get_projects_with_status();
CREATE OR REPLACE FUNCTION public.get_projects_with_status()
RETURNS TABLE (
    project_id UUID,
    class_id TEXT,
    type TEXT,
    title TEXT,
    description TEXT,
    image_url TEXT,
    location TEXT,
    schedule TEXT,
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
        p.location,
        p.schedule,
        p.fastpass_enabled,
        COALESCE(c.level, 1) as congestion_level,
        public.get_estimated_wait_time(p.project_id) as wait_time_min
    FROM public.projects p
    LEFT JOIN public.congestion c ON p.project_id = c.project_id
    ORDER BY p.sort_order ASC, p.class_id ASC;
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
SET search_path = public
AS $$
DECLARE
    v_value JSONB;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('status', 403, 'message', 'Forbidden');
    END IF;

    IF p_key IN ('fastpass_sale_school_opens_at', 'fastpass_sale_public_opens_at') AND p_value IS NULL THEN
        v_value := 'null'::jsonb;
    ELSIF p_value IS NULL THEN
        RETURN jsonb_build_object('status', 400, 'message', 'value is required');
    ELSE
        v_value := p_value;
    END IF;

    UPDATE public.system_settings
    SET value = v_value, updated_at = NOW()
    WHERE key = p_key;

    RETURN jsonb_build_object('status', 'success', 'key', p_key, 'value', v_value);
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
    issued_count INTEGER,
    festival_day TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        s.slot_id,
        s.start_time,
        s.end_time,
        s.capacity,
        (SELECT count(*)::int FROM public.fastpass_tickets t WHERE t.slot_id = s.slot_id) AS issued_count,
        s.festival_day
    FROM public.fastpass_slots s
    WHERE s.project_id = p_project_id
    ORDER BY s.festival_day, s.start_time;
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

-- quiz-rewards バケット作成
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('quiz-rewards', 'quiz-rewards', false)
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Authenticated users can read rewards" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'quiz-rewards');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- =============================================================================
-- SECTION 11: 初期データ（シードデータ）
-- =============================================================================

-- 11.1 システム設定（投票機能は除外）
INSERT INTO public.system_settings (key, value, description) VALUES
('quiz_enabled',          'true'::jsonb, 'Enable or disable quiz feature'),
('fastpass_enabled',      'true'::jsonb, 'Enable or disable fastpass issuance'),
('operator_edit_enabled', 'true'::jsonb, '運営者による企画情報（説明文・画像）の編集を許可する'),
('fastpass_sale_school_toggle', 'false'::jsonb, '校内祭ファストパス販売を即時オープン（開始日時と併用可）'),
('fastpass_sale_school_opens_at', 'null'::jsonb, '校内祭ファストパス販売開始の日時（JSON 文字列の ISO8601、null で未設定）'),
('fastpass_sale_public_toggle', 'false'::jsonb, '一般祭ファストパス販売を即時オープン（開始日時と併用可）'),
('fastpass_sale_public_opens_at', 'null'::jsonb, '一般祭ファストパス販売開始の日時（JSON 文字列の ISO8601、null で未設定）')
ON CONFLICT (key) DO NOTHING;

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

-- Quiz Questions
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

-- Quiz Rewards
INSERT INTO public.quiz_rewards (required_score, title_name, storage_path)
VALUES 
    (10, 'ブロンズ', 'bronze_Nagata_WP.png'),
    (30, 'シルバー', 'silver_Nagata_WP.png'),
    (60, 'ゴールド', 'gold_Nagata_WP.png'),
    (100, 'マスター', 'master_Nagata_WP.png')
ON CONFLICT (required_score) DO UPDATE SET 
    storage_path = EXCLUDED.storage_path,
    title_name = EXCLUDED.title_name;


-- 11.6 ファストパス枠（校内祭 2026-05-08 / 一般祭 2026-05-09）
DO $$
DECLARE
    r_project RECORD;
    v_school DATE := DATE '2026-05-08';
    v_public DATE := DATE '2026-05-09';
BEGIN
    FOR r_project IN SELECT project_id, title FROM public.projects WHERE fastpass_enabled = true LOOP
        RAISE NOTICE 'Seeding slots for: %', r_project.title;

        -- 校内祭 9:30–15:00 相当の代表枠
        INSERT INTO public.fastpass_slots (project_id, start_time, end_time, capacity, festival_day)
        VALUES
            (r_project.project_id, (v_school || ' 09:30:00+09')::timestamptz, (v_school || ' 11:00:00+09')::timestamptz, 20, 'school'),
            (r_project.project_id, (v_school || ' 11:00:00+09')::timestamptz, (v_school || ' 12:00:00+09')::timestamptz, 20, 'school'),
            (r_project.project_id, (v_school || ' 13:00:00+09')::timestamptz, (v_school || ' 14:00:00+09')::timestamptz, 20, 'school'),
            (r_project.project_id, (v_school || ' 14:00:00+09')::timestamptz, (v_school || ' 15:00:00+09')::timestamptz, 20, 'school');

        -- 一般祭 9:00–15:00 相当の代表枠
        INSERT INTO public.fastpass_slots (project_id, start_time, end_time, capacity, festival_day)
        VALUES
            (r_project.project_id, (v_public || ' 09:00:00+09')::timestamptz, (v_public || ' 11:00:00+09')::timestamptz, 20, 'public'),
            (r_project.project_id, (v_public || ' 11:00:00+09')::timestamptz, (v_public || ' 12:00:00+09')::timestamptz, 20, 'public'),
            (r_project.project_id, (v_public || ' 13:00:00+09')::timestamptz, (v_public || ' 14:00:00+09')::timestamptz, 20, 'public'),
            (r_project.project_id, (v_public || ' 14:00:00+09')::timestamptz, (v_public || ' 15:00:00+09')::timestamptz, 20, 'public');
    END LOOP;
END $$;

-- =============================================================================
-- SECTION 11: STORAGE BUCKETS
-- =============================================================================
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public) 
    VALUES ('public-assets', 'public-assets', true) 
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Public Access public-assets" ON storage.objects FOR SELECT USING ( bucket_id = 'public-assets' );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Public Upload public-assets" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'public-assets' );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- =============================================================================
-- END OF full_setup_v2.sql
-- =============================================================================
