-- Migration: Enforce Feature Toggles in RPCs
-- Run this in Supabase Dashboard > SQL Editor

/*
-- 1. Update cast_vote to check 'voting_enabled'
CREATE OR REPLACE FUNCTION public.cast_vote(p_project_id UUID, p_category TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_project_type TEXT;
    v_enabled BOOLEAN;
BEGIN
    -- Check Feature Toggle
    SELECT (value::text = 'true') INTO v_enabled 
    FROM public.system_settings 
    WHERE key = 'voting_enabled';

    IF v_enabled IS FALSE THEN
        RETURN jsonb_build_object('status', 403, 'message', 'Voting is currently disabled');
    END IF;

    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
         RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT type INTO v_project_type FROM public.projects WHERE project_id = p_project_id;
    
    IF v_project_type != p_category THEN
        RETURN jsonb_build_object('status', 400, 'message', 'Category mismatch');
    END IF;

    INSERT INTO public.votes (user_id, project_id, category)
    VALUES (v_user_id, p_project_id, p_category)
    ON CONFLICT (user_id, category) 
    DO UPDATE SET project_id = EXCLUDED.project_id, created_at = now();

    RETURN jsonb_build_object('status', 'ok');
END;
$$;
*/

-- 2. Update issue_fastpass_ticket to check 'fastpass_enabled'
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
    -- Check Feature Toggle
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

    -- 1. Check existing unused ticket
    PERFORM 1 FROM public.fastpass_tickets 
    WHERE user_id = v_user_id AND used = false 
    FOR UPDATE;
    
    IF FOUND THEN
        RETURN jsonb_build_object('status', 409, 'code', 'ALREADY_HAS_TICKET');
    END IF;

    -- 2. Check slot capacity
    SELECT capacity INTO v_capacity FROM public.fastpass_slots WHERE slot_id = p_slot_id FOR UPDATE;
    SELECT count(*) INTO v_count FROM public.fastpass_tickets WHERE slot_id = p_slot_id;

    IF v_count >= v_capacity THEN
        RETURN jsonb_build_object('status', 409, 'code', 'SLOT_FULL');
    END IF;

    -- 3. Issue ticket
    INSERT INTO public.fastpass_tickets (slot_id, user_id, qr_token)
    VALUES (p_slot_id, v_user_id, gen_random_uuid()::text)
    RETURNING ticket_id INTO v_ticket_id;

    RETURN jsonb_build_object('status', 'success', 'ticket_id', v_ticket_id);
END;
$$;

-- 3. Update submit_quiz_score to check 'quiz_enabled'
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
    -- Check Feature Toggle
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

    -- Iterate over answers (Key: question_id, Value: choice_index)
    FOR v_answer_record IN SELECT * FROM jsonb_each_text(p_answers)
    LOOP
        -- Fetch correct answer
        SELECT correct_choice_index INTO v_question 
        FROM public.quiz_questions 
        WHERE question_id = v_answer_record.key::INTEGER;
        
        IF FOUND THEN
            v_user_answer := v_answer_record.value::INTEGER;
            IF v_question.correct_choice_index = v_user_answer THEN
                v_total_score := v_total_score + 10; -- 10 points per question
                v_correct_count := v_correct_count + 1;
            END IF;
        END IF;
    END LOOP;

    -- Update Score
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
