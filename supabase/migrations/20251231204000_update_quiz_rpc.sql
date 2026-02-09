-- Update Quiz RPCs with real logic

-- 1. start_quiz_session
-- Allow public access, just returns valid question IDs? 
-- Actually, client can just fetch questions. We can skip complex session logic for MVP.

-- 2. submit_quiz_score
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
BEGIN
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
