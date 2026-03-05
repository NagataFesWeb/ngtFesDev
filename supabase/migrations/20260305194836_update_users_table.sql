-- Migration for users table (Supabase Auth ダミーメール運用方式)

-- 1. LINE login columnの削除
ALTER TABLE public.users 
  DROP COLUMN IF EXISTS line_user_id;

-- 2. login_id カラムの追加 (password_hashはSupabase Authが担うため不要)
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS login_id TEXT UNIQUE;

-- 既存レコードへのダミーデータ投入 (NOT NULL制約のため)
UPDATE public.users 
  SET login_id = 'legacy_user_' || gen_random_uuid()::text
  WHERE login_id IS NULL;

ALTER TABLE public.users 
  ALTER COLUMN login_id SET NOT NULL;

-- 3. auth.users 作成時のトリガー関数を更新
-- ダミーメール(login_id@ngtfes.local) または raw_user_meta_data から login_id を抽出して public.users に挿入する
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_login_id TEXT;
BEGIN
  -- raw_user_meta_data から login_id を取得するか、email の @ より前を利用する
  v_login_id := coalesce(
    new.raw_user_meta_data->>'login_id',
    split_part(new.email, '@', 1)
  );

  INSERT INTO public.users (user_id, login_id, display_name)
  VALUES (
    new.id, 
    v_login_id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Guest')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
