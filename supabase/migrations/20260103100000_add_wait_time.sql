-- Migration: Add Wait Time Columns to Projects
-- Run this in Supabase Dashboard > SQL Editor

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS rotation_time_min INTEGER DEFAULT 10, -- Time for 1 group in minutes (Default 10)
ADD COLUMN IF NOT EXISTS max_queue_size INTEGER DEFAULT 50;  -- Max people in queue (Default 50)

-- Function to get estimated wait time
-- Returns wait time in minutes for a given project
CREATE OR REPLACE FUNCTION public.get_estimated_wait_time(p_project_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_level INTEGER;
    v_max_queue INTEGER;
    v_rotation_time INTEGER;
    v_estimated_queue INTEGER;
    v_fastpass_count INTEGER;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- 1. Get Congestion Level
    SELECT level INTO v_level FROM public.congestion WHERE project_id = p_project_id;
    IF v_level IS NULL THEN v_level := 1; END IF;

    -- 2. Get Project Config
    SELECT max_queue_size, rotation_time_min 
    INTO v_max_queue, v_rotation_time 
    FROM public.projects 
    WHERE project_id = p_project_id;
    
    -- Defaults if null
    IF v_max_queue IS NULL THEN v_max_queue := 50; END IF;
    IF v_rotation_time IS NULL THEN v_rotation_time := 10; END IF;

    -- 3. Calculate Estimated Queue based on Level
    -- LVL1: <20% -> 0.1
    -- LVL2: 20-80% -> 0.5
    -- LVL3: >80% -> 0.9
    IF v_level = 1 THEN
        v_estimated_queue := v_max_queue * 0.1;
    ELSIF v_level = 2 THEN
        v_estimated_queue := v_max_queue * 0.5;
    ELSE
        v_estimated_queue := v_max_queue * 0.9;
    END IF;

    -- 4. Get Current Slot FastPass Count (Valid + Unused)
    -- Find slot that contains NOW()
    SELECT COUNT(*) INTO v_fastpass_count
    FROM public.fastpass_tickets t
    JOIN public.fastpass_slots s ON t.slot_id = s.slot_id
    WHERE s.project_id = p_project_id
    AND s.start_time <= v_now
    AND s.end_time > v_now
    AND t.used = false;

    IF v_fastpass_count IS NULL THEN v_fastpass_count := 0; END IF;

    -- 5. Calculate Total Wait Time
    -- Formula: (Queue + FastPass) * RotationTime
    -- Note: RotationTime is usually "Time per group", but here we treat it as "Time per person"??
    -- Actually, if rotation_time is "Time for 1 group", we need to know "People per group".
    -- But spec says "Rotation Time" (1 group's duration).
    -- Assuming "Queue" is number of *groups*? Or number of *people*?
    -- Usually "Max Queue Size" is people. "Rotation Time" is per group (e.g. 15 mins).
    -- If 1 group = 4 people, then 20 people = 5 groups.
    -- For simplicity/MVP: Let's assume queue size is "groups" OR rotation time is "per person equivalent".
    -- "Wait Time = Estimated Waiting People * Rotation Time (per person?)"
    -- Let's stick to the user's formula: `(EstimatedQueue + FP) * RotationTime`.
    -- This implies RotationTime is "Minutes per unit in queue".
    
    RETURN (v_estimated_queue + v_fastpass_count) * v_rotation_time;
END;
$$;
