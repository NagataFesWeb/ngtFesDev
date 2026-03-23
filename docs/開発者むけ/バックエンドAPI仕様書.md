# バックエンドAPI仕様書

---

## 1. 概要

本ドキュメントは、Next.js (Frontend) から呼び出す Supabase のインターフェース詳細を定義する。
Supabaseでは `postgrest-js` クライアントライブラリを使用するため、REST APIのエンドポイント定義ではなく、**Database Functions (RPC)** および **Client SDKの利用パターン** として記述する。

---

## 2. API / RPC 一覧

セキュリティとデータ整合性を担保するため、以下の操作は必ず RPC (Stored Procedure) 経由で実行する。
直接のテーブル操作（INSERT/UPDATE）は原則として RLS により禁止される。

### 2.1 ユーザー・認証関連

#### ユーザー登録 (`supabase.auth.signUp`)
* **概要**: 来場者の新規アカウント登録を行う。内部的にダミーのメールアドレスを使用する。
* **権限**: Public (Anon)
* **SDK利用箇所**: `app/login/page.tsx`
* **引数**:
  * `email`: `[login_id]@ngtfes.local` (フロントエンドで組み立てる)
  * `password`: ユーザーが入力したパスワード
  * `options.data.login_id`: ユーザーが入力したログインID (メタデータ)
  * `options.data.full_name`: 表示名 (任意)
* **処理**:
  1. SDK経由でSupabase Authにユーザー作成 (`auth.users`)
  2. DBのトリガー (`public.handle_new_user`) により `public.users` に自動的にレコードが作成される (`login_id`も引き継がれる)
  3. 自動ログインされてセッションが確立する

#### ユーザーログイン (`supabase.auth.signInWithPassword`)
* **概要**: 来場者のログインIDとパスワードで認証を行う。
* **権限**: Public (Anon)
* **SDK利用箇所**: `app/login/page.tsx`
* **引数**:
  * `email`: `[login_id]@ngtfes.local` (フロントエンドで組み立てる)
  * `password`: ユーザーが入力したパスワード
* **処理**:
  1. SDK経由でSupabase Authによるメール/パスワード認証
  2. 成功時、セッションが確立してJWTトークンがCookie等に保存される

#### `operator_login` (Database Function)
* **概要**: クラスIDとパスワードで認証し、運営者用セッション情報 (Token) を返す。
* **権限**: Public (Anon)
* **引数**:
  * `p_class_id` (text)
  * `p_password` (text)
* **処理**:
  1. `classes` テーブルを検索
  2. パスワードハッシュ検証 (`pgcrypto` 等を使用)
  3. 成功時: `operator_token` (JWTまたは署名付きSession ID) を発行して返す
  * **Note**: `operator_token` は短期有効（例: 12時間）とし、期限切れ時は再ログインが必要。
* **Response JSON (Success)**:
  ```json
  {
    "status": "success",
    "token": "eyJhbGciOiJIUzI1NiIsInR...",
    "class_name": "1-1"
  }
  ```
* **Response JSON (Error)**:
  ```json
  {
    "status": 401,
    "code": "UNAUTHORIZED",
    "message": "Invalid password"
  }
  ```
---

### 2.2 ファストパス関連

#### `issue_fastpass_ticket` (Database Function)
* **概要**: 排他制御を行いながらチケットを発券する。 `SECURITY DEFINER`。
* **権限**: Authenticated User (Guest)
* **引数**:
  * `p_slot_id` (uuid): 予約したい時間枠ID
  * **Note**: 実行ユーザーIDは `auth.uid()` から取得する（引数での受け渡しは禁止）。
* **戻り値**: `ticket_id` (uuid) または エラー
* **ロジック (PL/pgSQL)**:
  ```plpgsql
  BEGIN
    -- 0. トランザクション & Row Lock (slots)
    v_user_id := auth.uid();
    
    -- 1. ユーザーの既存未使用チケットチェック (厳密なチェック)
    PERFORM 1 FROM fastpass_tickets WHERE user_id = v_user_id AND used = false FOR UPDATE;
    IF FOUND THEN
      RAISE EXCEPTION 'ALREADY_HAS_TICKET';
    END IF;

    -- 2. スロット残数チェック
    SELECT capacity INTO v_capacity FROM fastpass_slots WHERE slot_id = p_slot_id FOR UPDATE;
    SELECT count(*) INTO v_count FROM fastpass_tickets WHERE slot_id = p_slot_id;
    
    IF v_count >= v_capacity THEN
      RAISE EXCEPTION 'SLOT_FULL';
    END IF;

    -- 3. 発券
    INSERT INTO fastpass_tickets ... RETURNING ticket_id;
  END;
  ```
* **Response JSON (Success)**:
  ```json
  {
    "ticket_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
  }
  ```

#### `verify_and_use_ticket` (Database Function)
* **概要**: 使用処理（QR消込）。Admin/Operatorのみ実行可。
* **権限**: Public (内部認証あり) or Admin
* **引数**:
  * `p_qr_token` (text): QRコードの内容
  * `p_operator_token` (text): 運営者トークン (Adminの場合はNULL可)
* **処理**:
  1. Operatorの場合、 `p_operator_token` を検証し、実行者の `class_id` を特定
  2. トークンからチケット特定
  3. チケットの時間枠・プロジェクトを確認
  4. Operatorの場合、自クラスのチケットか検証
  5. `used = true` に更新
* **Response JSON (Success)**:
  ```json
  {
    "status": "ok",
    "project_title": "お化け屋敷",
    "slot_time": "10:00 - 10:10"
  }
  ```
* **Response JSON (Error)**:
  ```json
  {
    "status": 400,
    "code": "INVALID_TOKEN",
    "message": "Time mismatch or class mismatch"
  }
  ```

---

### 2.3 クライアントサイド長田検定（クイズ）関連

今回の長田検定は、大規模な同時接続に耐えるためステートレス（DB上のセッションテーブルを持たない）で動作する設計となっている。

#### `get_quiz_questions` (Database Function)
* **概要**: クイズ出題用の問題10問をランダムに取得する。
* **権限**: Authenticated User (Guest)
* **引数**: なし
* **処理**:
  1. `quiz_questions` からランダムに10問取得。
  2. ブラウザのNetworkタブでのカンニングを防ぐため、正解は平文ではなく「ソルトを使ったハッシュ値」に変換してクライアントへ返す。
* **Response JSON (Success)**:
  ```json
  [
    {
      "q_id": 101,
      "text": "長田高校の創立年は？",
      "choices": ["1918", "1920", "1921", "1945"],
      "correct_hash": "a1b2c3d4..." // 例: sha256(question_id + correct_index + SALT)
    },
    ...
  ]
  ```

#### `submit_quiz_score` (Database Function)
* **概要**: クライアント側で採点されたスコアを最終的にDBへ記録・更新する。
* **権限**: Authenticated User (Guest)
* **引数**:
  * `p_score` (integer): クライアントで計算されたスコア (0〜10)
  * `p_signature` (text): スコア改ざん防止用のハッシュシグネチャ (例: `HMAC_SHA256(user_id + score, SERVER_SECRET)`)
* **処理**:
  1. (Validation) 送信された `p_signature` をサーバー側の `SERVER_SECRET` で再計算し、一致するか確認する。
  2. (Rate Limiting) `quiz_scores` テーブルのユーザーの `updated_at` を確認し、前回から一定時間（例: 1分）以内であればエラー `429 TOO_MANY_REQUESTS` を返す。
  3. `quiz_scores` をUPSERTし、`play_count` を加算、`total_score` に今回のスコアを加算、`highest_score` を必要に応じて更新する。
  4. 最終スコア状況を返す。
* **Response JSON (Success)**:
  ```json
  {
    "score": 8,
    "total_score": 50,
    "highest_score": 10,
    "play_count": 5
  }
  ```

#### `get_quiz_reward_url` (Database Function)
* **概要**: 到達した称号に応じた壁紙のダウンロード用署名付きURLを取得する。
* **権限**: Authenticated User (Guest)
* **引数**:
  * `p_reward_id` (integer): `quiz_rewards` テーブルのID
* **処理**:
  1. `quiz_scores` より実行ユーザー (`auth.uid()`) の `total_score` を取得。
  2. `quiz_rewards` より `p_reward_id` に対応する `required_score` を取得し、ユーザーのスコアが到達しているか検証。
  3. 到達している場合、ストレージ API (内部的に `storage.create_signed_url` 相当) を使用して、対象の `storage_path` に対する有効期限付き (例: 1時間) URLを発行して返す。
  4. 未到達の場合は `401 UNAUTHORIZED` を返す。
* **Response JSON (Success)**:
  ```json
  {
    "signed_url": "https://[project].supabase.co/storage/v1/object/sign/quiz-rewards/...",
    "expires_in": 3600
  }
  ```

---

### 2.4 管理者・運用関連



#### `admin_update_congestion` (Database Function)
* **概要**: 本システムにおいて混雑状況を更新できる唯一のAPI。
* **権限**: Admin Only
* **引数**: `p_project_id`, `p_level`
* **処理**:
  1. `congestion` テーブル更新
  2. `operation_logs` に記録

#### `admin_reset_all_data` (Database Function)
* **概要**: 文化祭開始前などにデータを初期化する。**危険な操作のため厳重なチェックを行う。**
* **権限**: Admin Only
* **引数**:
  * `p_target_table` (text): リセット対象 ('users', 'fastpass', 'all')
  * `p_confirmation` (text): 確認キーワード (例: "RESET 2026")
* **処理**:
  1. `p_confirmation` が規定のキーワードと一致するか確認。不一致ならエラー。
  2. `p_target_table` に応じてデータを `DELETE` (または `TRUNCATE`)。
     * `users`: `auth.users` ではなく `public.users` (および紐づく全データ) を削除。
     * `fastpass`: `tickets` および `slots` を削除。
  3. `operation_logs` に記録。
* **Response JSON (Success)**:
  ```json
  { "status": "success", "message": "All user data has been reset." }
  ```

---

## 3. エラーコード定義

API/RPCが返す標準エラーコード体系 (Supabase Error Response `details` or Custom JSON)。

| Code | Message | Description |
| :--- | :--- | :--- |
| `400` | `INVALID_ARGUMENT` | 入力値不正 |
| `401` | `UNAUTHORIZED` | 未認証または権限不足 |
| `403` | `FORBIDDEN` | 操作不許可（例：他クラスの編集） |
| `409` | `ALREADY_HAS_TICKET` | ファストパス所持数上限 |
| `409` | `SLOT_FULL` | 満席 |
| `410` | `SESSION_EXPIRED` | クイズセッション期限切れ |
* **Standard Error JSON**:
  ```json
  {
    "status": 400,
    "code": "INVALID_ARGUMENT",
    "message": "Invalid input"
  }
  ```
