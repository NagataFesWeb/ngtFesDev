-- エラー「Email address is invalid」に対する修正スクリプト (dummy.ngtfes.com への変更)

-- 1. トリガー関数内のメールアドレスドメインに依存するロジックを修正
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_login_id TEXT;
  v_display_name TEXT;
BEGIN
  -- メールアドレスの @ より前を基本の login_id とする
  v_login_id := coalesce(
    new.raw_user_meta_data->>'login_id',
    split_part(new.email, '@', 1)
  );

  -- 空チェック
  IF v_login_id IS NULL OR length(trim(v_login_id)) = 0 THEN
    v_login_id := 'guest_' || substr(gen_random_uuid()::text, 1, 8);
  END IF;

  -- 表示名の抽出
  v_display_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    'Guest'
  );

  -- public.users にユーザー情報を挿入
  INSERT INTO public.users (user_id, login_id, display_name)
  VALUES (
    new.id, 
    v_login_id,
    v_display_name
  );

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in handle_new_user. user_id: %, login_id: %, Error: %', new.id, v_login_id, SQLERRM;
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
