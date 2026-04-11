-- operator_update_project関数を更新し、引数にp_titleを追加
-- データベース内で企画名を編集可能にするためのマイグレーション

CREATE OR REPLACE FUNCTION public.operator_update_project(p_operator_token TEXT, p_title TEXT, p_description TEXT, p_image_url TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_class_id TEXT;
    v_project_id UUID;
BEGIN
    -- Verify Operator
    v_class_id := p_operator_token;
    PERFORM 1 FROM public.classes WHERE class_id = v_class_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('status', 401); END IF;

    -- Update Project
    UPDATE public.projects
    SET 
        title = COALESCE(p_title, title),
        description = COALESCE(p_description, description),
        image_url = COALESCE(p_image_url, image_url)
    WHERE class_id = v_class_id;

    RETURN jsonb_build_object('status', 'success');
END;
$$;
