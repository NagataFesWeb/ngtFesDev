-- 整理券キャンセル機能（時間枠の開始時間までキャンセル可能）
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
