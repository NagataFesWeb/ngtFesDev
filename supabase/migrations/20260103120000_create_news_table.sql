-- Migration: Create News Table
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.news (
    news_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    is_important BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- Policies
-- Public: Select active news
CREATE POLICY "Public can view active news" ON public.news
    FOR SELECT TO public
    USING (is_active = true);

-- Admin: All access
-- Assuming we have an is_admin() function or using service role for admin dashboard if client-side
-- For now, allow authenticated users with 'admin' role if implementing strict RLS, 
-- OR just use logic similar to other admin tables if they exist.
-- Let's check existing Admin policies. Usually we use `auth.uid()` check against `users` table role 'admin'.

CREATE POLICY "Admins can manage news" ON public.news
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Create trigger for updated_at
CREATE TRIGGER update_news_modtime
    BEFORE UPDATE ON public.news
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
