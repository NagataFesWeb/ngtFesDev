-- Migration: Add Quiz Ranking with Index Optimization
-- Created at: 2026-03-05 22:54:00

-- 1. Add Index for performance
CREATE INDEX IF NOT EXISTS idx_quiz_scores_total_score ON public.quiz_scores(total_score DESC);

-- 2. Create get_quiz_ranking RPC
-- Fetches top 3 users securely bypassing RLS for read-only ranking
DROP FUNCTION IF EXISTS public.get_quiz_ranking();

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
