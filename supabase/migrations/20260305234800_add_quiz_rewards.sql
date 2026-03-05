-- Migration: Add Quiz Rewards Table and Storage Assets
-- Created at: 2026-03-05 23:48:00

-- 1. Create quiz_rewards table
CREATE TABLE IF NOT EXISTS public.quiz_rewards (
    id SERIAL PRIMARY KEY,
    required_score INTEGER NOT NULL,
    title_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure unique constraint exists for ON CONFLICT (for existing tables)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_required_score') THEN
        ALTER TABLE public.quiz_rewards ADD CONSTRAINT unique_required_score UNIQUE (required_score);
    END IF;
END $$;

-- 2. Enable RLS on quiz_rewards
ALTER TABLE public.quiz_rewards ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policy for quiz_rewards (Read-only for all authenticated)
DROP POLICY IF EXISTS "Allow read for all authenticated users" ON public.quiz_rewards;
CREATE POLICY "Allow read for all authenticated users" ON public.quiz_rewards
    FOR SELECT TO authenticated USING (true);

-- 4. Seed Data
INSERT INTO public.quiz_rewards (required_score, title_name, storage_path)
VALUES 
    (10, 'ブロンズ', 'bronze_Nagata_WP.png'),
    (30, 'シルバー', 'silver_Nagata_WP.png'),
    (60, 'ゴールド', 'gold_Nagata_WP.png'),
    (100, 'マスター', 'master_Nagata_WP.png')
ON CONFLICT (required_score) DO UPDATE SET 
    storage_path = EXCLUDED.storage_path,
    title_name = EXCLUDED.title_name;

-- 5. Create Storage Bucket (if not exists via SQL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('quiz-rewards', 'quiz-rewards', false)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage RLS Policies
DROP POLICY IF EXISTS "Authenticated users can read rewards" ON storage.objects;
CREATE POLICY "Authenticated users can read rewards" ON storage.objects
    FOR SELECT TO authenticated USING (bucket_id = 'quiz-rewards');

-- 7. Create get_quiz_reward_url RPC
-- SECURITY DEFINER is used to check scores and generate signed URLs
CREATE OR REPLACE FUNCTION public.get_quiz_reward_url(p_reward_id INT)
RETURNS TABLE (
    signed_url TEXT,
    expires_in INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_total_score INT;
    v_required_score INT;
    v_storage_path TEXT;
BEGIN
    v_user_id := auth.uid();
    
    -- Get user score
    SELECT total_score INTO v_total_score FROM public.quiz_scores WHERE user_id = v_user_id;
    IF v_total_score IS NULL THEN v_total_score := 0; END IF;
    
    -- Get reward reqs
    SELECT required_score, storage_path INTO v_required_score, v_storage_path 
    FROM public.quiz_rewards WHERE id = p_reward_id;
    
    IF v_required_score IS NULL THEN
        RAISE EXCEPTION 'REWARD_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;
    
    -- Check eligibility
    IF v_total_score < v_required_score THEN
        RAISE EXCEPTION 'INSUFFICIENT_SCORE' USING ERRCODE = '42501';
    END IF;
    
    -- Return the storage_path. The client side will then call 
    -- supabase.storage.from('quiz-rewards').createSignedUrl(path, 3600).
    
    RETURN QUERY SELECT v_storage_path, 3600;
END;
$$;
