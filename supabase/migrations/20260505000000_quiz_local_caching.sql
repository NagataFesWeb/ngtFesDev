-- Migration: Quiz Local Caching and Batch Syncing

-- 1. Modify get_quiz_questions to return ALL questions
-- By removing the LIMIT 10, the client can cache all questions and handle randomization locally.
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
            'explanation', explanation,
            'correct_hash', encode(digest(question_id::text || correct_choice_index::text || v_salt, 'sha256'), 'hex')
        )
    )
    INTO v_questions
    FROM public.quiz_questions;

    RETURN coalesce(v_questions, '[]');
END;
$$;

-- 2. Create submit_quiz_score_batch
-- Handles syncing accumulated scores from the local client queue.
CREATE OR REPLACE FUNCTION public.submit_quiz_score_batch(
    p_score_delta INTEGER,
    p_highest_score INTEGER,
    p_play_count INTEGER,
    p_signature TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_server_secret TEXT := 'NgtFes26_Super_Secret_Key'; 
    v_expected_signature TEXT;
    v_current_total INTEGER;
    v_current_highest INTEGER;
    v_current_play_count INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Basic validation
    IF p_score_delta < 0 OR p_play_count < 0 OR p_highest_score < 0 OR p_highest_score > 10 THEN
        RETURN jsonb_build_object('status', 400, 'message', 'Invalid parameters');
    END IF;

    -- HMAC signature validation
    -- Signature expects: user_id || score_delta || highest_score || play_count
    v_expected_signature := encode(hmac(v_user_id::text || p_score_delta::text || p_highest_score::text || p_play_count::text, v_server_secret, 'sha256'), 'hex');
    IF p_signature != v_expected_signature THEN
        RETURN jsonb_build_object('status', 403, 'message', 'Invalid signature');
    END IF;

    -- Upsert the user's score stats
    INSERT INTO public.quiz_scores (user_id, highest_score, total_score, play_count, updated_at)
    VALUES (v_user_id, p_highest_score, p_score_delta, p_play_count, now())
    ON CONFLICT (user_id) DO UPDATE 
    SET 
        highest_score = GREATEST(quiz_scores.highest_score, EXCLUDED.highest_score),
        total_score = quiz_scores.total_score + EXCLUDED.total_score,
        play_count = quiz_scores.play_count + EXCLUDED.play_count,
        updated_at = now()
    RETURNING total_score, highest_score, play_count 
    INTO v_current_total, v_current_highest, v_current_play_count;

    RETURN jsonb_build_object(
        'status', 'success',
        'total_score', v_current_total,
        'highest_score', v_current_highest,
        'play_count', v_current_play_count
    );
END;
$$;
