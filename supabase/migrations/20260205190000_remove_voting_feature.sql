-- remove_voting_feature.sql
-- This script safely removes the voting feature and its associated data/functions from the database.

-- 1. Drop the votes table and its constraints/indexes/RLS policies
DROP TABLE IF EXISTS public.votes CASCADE;

-- 2. Drop voting related RPC functions
DROP FUNCTION IF EXISTS public.cast_vote(UUID, TEXT);
DROP FUNCTION IF EXISTS public.admin_get_vote_summary();

-- 3. Modify admin_reset_all_data to remove vote deletion logic
CREATE OR REPLACE FUNCTION public.admin_reset_all_data(p_target_table TEXT, p_confirmation TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM public.users WHERE user_id = auth.uid();
    IF v_role IS DISTINCT FROM 'admin' THEN
        RETURN jsonb_build_object('status', 403, 'message', 'Forbidden');
    END IF;

    IF p_confirmation != 'RESET 2026' THEN
         RETURN jsonb_build_object('status', 400, 'message', 'Invalid confirmation');
    END IF;

    IF p_target_table = 'all' THEN
        DELETE FROM public.quiz_sessions;
        DELETE FROM public.quiz_scores;
    END IF;
    
    IF p_target_table = 'all' OR p_target_table = 'fastpass' THEN
         DELETE FROM public.fastpass_tickets;
         DELETE FROM public.fastpass_slots;
    END IF;

    IF p_target_table = 'all' OR p_target_table = 'users' THEN
         DELETE FROM public.users WHERE role = 'guest'; 
    END IF;

    INSERT INTO public.operation_logs (operator_id, action, details)
    VALUES (auth.uid()::text, 'admin_reset_all_data', jsonb_build_object('target', p_target_table));

    RETURN jsonb_build_object('status', 'success');
END;
$$;

-- 4. Remove voting_enabled from System Settings (if such table/record exists)
-- Assuming a table named system_settings holds the feature toggles based on the migration files
DELETE FROM public.system_settings WHERE key = 'voting_enabled';
