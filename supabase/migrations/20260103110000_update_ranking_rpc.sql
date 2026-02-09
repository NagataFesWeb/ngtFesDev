-- Migration: Update Quiz Ranking RPC
-- Order by Total Score instead of Highest Score
-- Run in Supabase SQL Editor

DROP FUNCTION IF EXISTS public.get_quiz_ranking();

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
