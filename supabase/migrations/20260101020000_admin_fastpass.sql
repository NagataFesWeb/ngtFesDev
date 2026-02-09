-- RPC: Get all projects with FastPass status
CREATE OR REPLACE FUNCTION public.admin_get_fastpass_projects()
RETURNS TABLE (
    project_id UUID,
    title TEXT,
    class_name TEXT,
    fastpass_enabled BOOLEAN,
    total_slots INTEGER,
    total_issued INTEGER
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        p.project_id,
        p.title,
        c.class_name,
        p.fastpass_enabled,
        (SELECT count(*) FROM public.fastpass_slots s WHERE s.project_id = p.project_id) as total_slots,
        (SELECT count(*) FROM public.fastpass_tickets t JOIN public.fastpass_slots s ON t.slot_id = s.slot_id WHERE s.project_id = p.project_id) as total_issued
    FROM public.projects p
    LEFT JOIN public.classes c ON p.class_id = c.class_id
    ORDER BY c.class_name;
$$;

-- RPC: Get slots for a project with usage count
CREATE OR REPLACE FUNCTION public.admin_get_project_slots(p_project_id UUID)
RETURNS TABLE (
    slot_id UUID,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    capacity INTEGER,
    issued_count INTEGER
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        s.slot_id,
        s.start_time,
        s.end_time,
        s.capacity,
        (SELECT count(*)::int FROM public.fastpass_tickets t WHERE t.slot_id = s.slot_id) as issued_count
    FROM public.fastpass_slots s
    WHERE s.project_id = p_project_id
    ORDER BY s.start_time;
$$;

-- RPC: Update Slot Capacity
CREATE OR REPLACE FUNCTION public.admin_update_slot_capacity(p_slot_id UUID, p_capacity INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_project_id UUID;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('status', 403, 'message', 'Forbidden');
    END IF;

    UPDATE public.fastpass_slots
    SET capacity = p_capacity
    WHERE slot_id = p_slot_id
    RETURNING project_id INTO v_project_id;

    -- Log Operation
    INSERT INTO public.operation_logs (operator_id, action, details)
    VALUES (
        auth.uid()::text,
        'admin_update_slot_capacity', 
        jsonb_build_object('slot_id', p_slot_id, 'capacity', p_capacity, 'project_id', v_project_id)
    );

    RETURN jsonb_build_object('status', 'success');
END;
$$;

-- RPC: Toggle Project FastPass
CREATE OR REPLACE FUNCTION public.admin_toggle_project_fastpass(p_project_id UUID, p_enabled BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('status', 403, 'message', 'Forbidden');
    END IF;

    UPDATE public.projects
    SET fastpass_enabled = p_enabled
    WHERE project_id = p_project_id;

    -- Log Operation
    INSERT INTO public.operation_logs (operator_id, action, details)
    VALUES (
        auth.uid()::text, 
        'admin_toggle_project_fastpass', 
        jsonb_build_object('project_id', p_project_id, 'enabled', p_enabled)
    );

    RETURN jsonb_build_object('status', 'success');
END;
$$;
