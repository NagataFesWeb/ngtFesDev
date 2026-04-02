-- 既に旧版 20260402120000 を適用済みのDB向け: 枠の期限を end_time 基準に統一し、
-- 販売開始日時クリア時に JSON null を正しく保存できるようにする。

-- -----------------------------------------------------------------------------
-- admin_update_setting: opens_at キーは p_value NULL → JSON null（列は NOT NULL）
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

-- -----------------------------------------------------------------------------
-- 期限切れチケット破棄・発券・検証（end_time を過ぎたら失効／発券不可）
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
