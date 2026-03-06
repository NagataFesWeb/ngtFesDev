-- Migration: Add Operator Edit Enabled Setting
-- Created at: 2026-03-06 21:45:00

INSERT INTO public.system_settings (key, value, description)
VALUES (
    'operator_edit_enabled',
    'true',
    '運営者による企画情報（説明文・画像）の編集を許可する'
)
ON CONFLICT (key) DO NOTHING;
