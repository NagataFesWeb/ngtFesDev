-- Migration for users table to match specification in docs/開発者むけ/バックエンド仕様書.md

-- Drop LINE login column if it exists
ALTER TABLE public.users 
  DROP COLUMN IF EXISTS line_user_id;

-- Add new columns as nullable first
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS login_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- For existing records (if any), populate with dummy data to satisfy NOT NULL constraints
UPDATE public.users 
  SET login_id = 'legacy_user_' || gen_random_uuid()::text,
      password_hash = 'legacy_user_no_password'
  WHERE login_id IS NULL;

-- Enforce NOT NULL constraints
ALTER TABLE public.users 
  ALTER COLUMN login_id SET NOT NULL,
  ALTER COLUMN password_hash SET NOT NULL;
