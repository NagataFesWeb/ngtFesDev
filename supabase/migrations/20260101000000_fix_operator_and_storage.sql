-- Update operator_login to return project_id
CREATE OR REPLACE FUNCTION public.operator_login(p_class_id TEXT, p_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_class_name TEXT;
    v_password_hash TEXT;
    v_project_id UUID;
BEGIN
    SELECT class_name, password_hash INTO v_class_name, v_password_hash
    FROM public.classes
    WHERE class_id = p_class_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 401, 'message', 'Invalid class ID');
    END IF;

    IF v_password_hash != p_password THEN
         RETURN jsonb_build_object('status', 401, 'message', 'Invalid password');
    END IF;

    -- Fetch Project ID
    SELECT project_id INTO v_project_id FROM public.projects WHERE class_id = p_class_id;

    RETURN jsonb_build_object(
        'status', 'success',
        'token', p_class_id, 
        'class_name', v_class_name,
        'project_id', v_project_id
    );
END;
$$;

-- Attempt to create storage bucket (Note: This usually requires superuser or specific permissions)
-- We use DO block to avoid errors if storage schema is not accessible, but ideally this runs in dashboard SQL editor.
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public) 
    VALUES ('project-images', 'project-images', true) 
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
    -- Ignore errors if storage not available/permission denied
    NULL;
END $$;

-- Policies (Permissive for local dev/MVP)
-- These might fail if policies already exist or permissions are tight.
DO $$
BEGIN
    CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'project-images' );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'project-images' );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- RPC for operators to update their project info
CREATE OR REPLACE FUNCTION public.operator_update_project(p_operator_token TEXT, p_description TEXT, p_image_url TEXT)
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
        description = COALESCE(p_description, description),
        image_url = COALESCE(p_image_url, image_url)
    WHERE class_id = v_class_id;

    RETURN jsonb_build_object('status', 'success');
END;
$$;
