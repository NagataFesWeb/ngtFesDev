-- お知らせにタイトル列、ファストパスに祭日区分・販売開始制御、発券・破棄ロジック

-- -----------------------------------------------------------------------------
-- 1. news.title
-- -----------------------------------------------------------------------------
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS title TEXT;

UPDATE public.news
SET title = left(content, 80)
WHERE title IS NULL;

ALTER TABLE public.news ALTER COLUMN title SET NOT NULL;
ALTER TABLE public.news ALTER COLUMN title SET DEFAULT '';

-- -----------------------------------------------------------------------------
-- 2. fastpass_slots.festival_day (校内祭 / 一般祭)
-- -----------------------------------------------------------------------------
ALTER TABLE public.fastpass_slots
    ADD COLUMN IF NOT EXISTS festival_day TEXT NOT NULL DEFAULT 'school'
    CHECK (festival_day IN ('school', 'public'));

COMMENT ON COLUMN public.fastpass_slots.festival_day IS 'school=校内祭日, public=一般祭日';

-- -----------------------------------------------------------------------------
-- 3. ファストパス販売開始（校内祭・一般祭それぞれ toggle または 開始日時）
-- -----------------------------------------------------------------------------
INSERT INTO public.system_settings (key, value, description) VALUES
(
    'fastpass_sale_school_toggle',
    'false'::jsonb,
    '校内祭ファストパス販売を即時オープン（開始日時と併用可）'
),
(
    'fastpass_sale_school_opens_at',
    'null'::jsonb,
    '校内祭ファストパス販売開始の日時（JSON 文字列の ISO8601、null で未設定）'
),
(
    'fastpass_sale_public_toggle',
    'false'::jsonb,
    '一般祭ファストパス販売を即時オープン（開始日時と併用可）'
),
(
    'fastpass_sale_public_opens_at',
    'null'::jsonb,
    '一般祭ファストパス販売開始の日時（JSON 文字列の ISO8601、null で未設定）'
)
ON CONFLICT (key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. ヘルパー: 祭日ごとの販売オープン判定
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 5. 販売状態（フロント用）
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 6. 期限切れチケットの手動破棄（無効化済み枠で新規取得をブロックしないための整理）
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 7. 発券 RPC（有効期限・祭日販売・祭日ごと1枚まで）
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 8. 検証時: 有効期限超過は使用不可
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 9. 管理者スロット一覧に festival_day を追加
-- -----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.admin_get_project_slots(UUID);
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

-- -----------------------------------------------------------------------------
-- 10. 管理者設定更新: fastpass_sale_*_opens_at をクリアするとき p_value が NULL でも
--     system_settings.value は NOT NULL のため JSON null を保存する
-- -----------------------------------------------------------------------------
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
