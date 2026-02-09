-- Fix: Ensure News Table and Admin Helper Exist
-- Run this in Supabase SQL Editor

-- 1. Create is_admin helper function (Security Definer to access users table)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE user_id = auth.uid()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create News Table if not exists
CREATE TABLE IF NOT EXISTS public.news (
    news_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    is_important BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- 4. Re-create Policies (Drop first to avoid errors)
DROP POLICY IF EXISTS "Public can view active news" ON public.news;
DROP POLICY IF EXISTS "Admins can manage news" ON public.news;

-- Public can view active news
CREATE POLICY "Public can view active news" ON public.news
    FOR SELECT TO public
    USING (is_active = true);

-- Admins can manage all news
CREATE POLICY "Admins can manage news" ON public.news
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 5. Helper for updated_at (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Trigger for news
DROP TRIGGER IF EXISTS update_news_modtime ON public.news;
CREATE TRIGGER update_news_modtime
    BEFORE UPDATE ON public.news
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 7. Force Schema Cache Reload
COMMENT ON TABLE public.news IS 'News items for the top page';
