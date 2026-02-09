-- Function to get top 10 quiz scores
CREATE OR REPLACE FUNCTION public.get_quiz_ranking()
RETURNS TABLE (
    display_name TEXT,
    highest_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.display_name,
        s.highest_score
    FROM public.quiz_scores s
    JOIN public.users u ON s.user_id = u.user_id
    ORDER BY s.highest_score DESC, s.updated_at ASC
    LIMIT 10;
END;
$$;
