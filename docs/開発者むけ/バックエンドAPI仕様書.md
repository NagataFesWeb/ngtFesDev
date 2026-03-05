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

#### `visitor_register` (Database Function)
* **概要**: 来場者の新規アカウント登録を行う。
* **権限**: Public (Anon)
* **引数**:
  * `p_login_id` (text): ユーザーが指定するログインID
  * `p_password` (text): パスワード (平文、内部でハッシュ化)
  * `p_display_name` (text): 表示名 (任意)
* **処理**:
  1. `users` テーブルにて `login_id` の重複チェック
  2. パスワードをハッシュ化して保存 (`pgcrypto` 等を使用)
  3. `users` テーブルに新しいUUID (`user_id`) でレコードをリソース (INSERT)
  4. 成功時: カスタムToken (JWT等) セッション情報を生成して返却
* **Response JSON (Success)**:
  ```json
  {
    "status": "success",
    "user_id": "uuid...",
    "token": "eyJhbGciOiJIUzI1NiIsInR..."
  }
  ```

#### `visitor_login` (Database Function)
* **概要**: 来場者のログインIDとパスワードで認証を行う。
* **権限**: Public (Anon)
* **引数**:
  * `p_login_id` (text)
  * `p_password` (text)
* **処理**:
  1. `users` テーブルを `login_id` で検索
  2. パスワードハッシュの検証 (`pgcrypto` 等を使用)
  3. 成功時: カスタムToken (JWT等) セッション情報を生成して返却
* **Response JSON (Success)**:
  ```json
  {
    "status": "success",
    "user_id": "uuid...",
    "token": "eyJhbGciOiJIUzI1NiIsInR..."
  }
  ```
* **Response JSON (Error)**:
  ```json
  {
    "status": 401,
    "code": "UNAUTHORIZED",
    "message": "Invalid login ID or password"
  }
  ```

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

### 2.3 クイズ関連

#### `start_quiz_session` (Database Function)
* **概要**: 新しいクイズセッションを開始する。
* **引数**: なし (`auth.uid()` を使用)
* **処理**:
  1. `quiz_questions` からランダムに10問取得
  2. `quiz_sessions` に正解と共に保存 (`expires_at`設定)
  3. クライアントには問題文と選択肢のみを返す（正解は返さない）
* **Response JSON (Success)**:
  ```json
  {
    "session_id": "uuid...",
    "questions": [
      {
        "q_id": 101,
        "text": "長田高校の創立年は？",
        "choices": ["1918", "1920", "1921", "1945"]
      },
      ...
    ],
    "expires_at": "2025-10-xxT..."
  }
  ```

#### `submit_quiz_score` (Database Function)
* **概要**: 採点とスコア登録。
* **引数**:
  * `p_session_id` (uuid)
  * `p_answers` (jsonb): `[{"q_id": 1, "choice": 2}, ...]`
* **処理**:
  1. セッション有効期限チェック (重要: **DBサーバー時刻 `now()` を基準とする**)
  2. 同一 `session_id` に対する回答受付は1回のみとする（処理後にセッション無効化フラグを立てる等の対策）
  3. DB内の `correct_answers` と照合して採点
  4. `quiz_scores` を UPSERT 更新 (`highest_score` 判定含む)
  5. 最終スコアを返す
* **Response JSON (Success)**:
  ```json
  {
    "score": 8,
    "total_score": 50,
    "is_highest": true
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
