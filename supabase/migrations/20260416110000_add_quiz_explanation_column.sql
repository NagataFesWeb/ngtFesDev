-- Migration: Add explanation column to quiz_questions and update RPC

-- 1. Add explanation column if not exists
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS explanation TEXT DEFAULT '';

-- 2. Update get_quiz_questions RPC to include explanation in return data
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
