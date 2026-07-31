# NgtFes26 データベース設計仕様書 (docs/database.md)

本ドキュメントは、Supabase (PostgreSQL) 上で構築されている長田高校文化祭 Web アプリケーションの物理スキーマ、リレーション、Row Level Security (RLS) ポリシー、および Database Functions (RPC) の詳細仕様を定義するものです。

---

## 1. データベース全体概要

* **DBMS**: PostgreSQL 15+ (Supabase Managed)
* **Schema**: `public`
* **主キー方針**: UUID v4 (`gen_random_uuid()`) または Auto-increment integer / Natural key
* **タイムスタンプ**: すべて `TIMESTAMPTZ` (Timezone 付き)

---

## 2. テーブル定義一覧 (Table Schemas)

Supabase MCP から取得した実際のデータベース物理スキーマ情報に基づく定義です。

### 2.1 `users` (ユーザー情報)
来場者アカウント情報を管理します。Auth 連携用テーブル。
| Column | Type | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `user_id` | `uuid` | NO | `gen_random_uuid()` | PK (`auth.users.id` と同一) |
| `login_id` | `text` | NO | - | ログインID (UNIQUE) |
| `display_name` | `text` | YES | `'Guest'::text` | 表示用ニックネーム |
| `role` | `text` | YES | `'guest'::text` | 権限 (`guest`, `admin`) |
| `created_at` | `timestamptz` | YES | `now()` | 登録日時 |

### 2.2 `classes` (運営クラス・団体認証)
運営者ログインに使用するクラス・団体マスターです。
| Column | Type | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `class_id` | `text` | NO | - | PK (例: "1-1", "band-a") |
| `class_name` | `text` | NO | - | 表示名 (例: "1年1組 喫茶") |
| `password_hash` | `text` | NO | - | ログイン暗号化パスワード |

### 2.3 `projects` (企画マスター)
文化祭の全企画・パビリオン情報を管理します。
| Column | Type | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `project_id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `class_id` | `text` | YES | - | FK (`classes.class_id`) |
| `type` | `text` | YES | - | 種別 (`class`, `food`, `stage`, `exhibition`) |
| `title` | `text` | NO | - | 企画タイトル |
| `description` | `text` | YES | - | 詳細説明文 |
| `image_url` | `text` | YES | - | サムネイル画像URL |
| `location` | `text` | YES | - | 開催場所 (例: "3F 301教室") |
| `schedule` | `text` | YES | - | 開催時間 |
| `fastpass_enabled` | `boolean` | YES | `false` | 整理券実施フラグ |
| `rotation_time_min` | `integer` | YES | `10` | 回転率 (分/枠) |
| `max_queue_size` | `integer` | YES | `50` | 最大待ち人数目安 |
| `sort_order` | `integer` | YES | - | 一覧表示順 |
| `created_at` | `timestamptz` | YES | `now()` | - |

### 2.4 `congestion` (リアルタイム混雑度)
各企画の現在の混雑状況を保持します (Project 1:1)。
| Column | Type | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `project_id` | `uuid` | NO | - | PK, FK (`projects.project_id`) |
| `level` | `integer` | YES | `1` | 混雑度 (1:空き, 2:普通, 3:混雑) |
| `updated_at` | `timestamptz` | YES | `now()` | 最終更新日時 |

### 2.5 `fastpass_slots` (整理券時間枠)
各企画のファストパス発行枠と定員を管理します。
| Column | Type | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `slot_id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `project_id` | `uuid` | YES | - | FK (`projects.project_id`) |
| `start_time` | `timestamptz` | NO | - | 枠開始時刻 |
| `end_time` | `timestamptz` | NO | - | 枠終了時刻 |
| `capacity` | `integer` | YES | `0` | 発券可能定員数 |
| `festival_day` | `festival_day` (enum) | NO | `'school'` | 区分 (`school`:校内祭, `public`:一般祭) |

### 2.6 `fastpass_tickets` (整理券チケット)
来場者に発券された整理券の実体を管理します。
| Column | Type | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `ticket_id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `slot_id` | `uuid` | YES | - | FK (`fastpass_slots.slot_id`) |
| `user_id` | `uuid` | YES | - | FK (`users.user_id`) |
| `qr_token` | `text` | NO | - | QR表示・検証用トークン (UNIQUE) |
| `used` | `boolean` | YES | `false` | 使用済み (消し込み) フラグ |
| `issued_at` | `timestamptz` | YES | `now()` | 発行日時 |

### 2.7 `quiz_questions` (長田検定問題マスター)
クイズの問題および選択肢を管理します。
| Column | Type | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `question_id` | `integer` | NO | `nextval(...)` | PK |
| `question_text` | `text` | NO | - | 問題文 |
| `choices` | `jsonb` | NO | - | 選択肢配列 `["A", "B", "C", "D"]` |
| `correct_choice_index` | `integer` | NO | - | 正解インデックス (0〜3) |
| `explanation` | `text` | YES | `''` | 解答解説文 |

### 2.8 `quiz_rewards` (クイズ報酬壁紙マスター)
| Column | Type | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `integer` | NO | `nextval(...)` | PK |
| `required_score` | `integer` | NO | - | 解放に必要な累計スコア |
| `title_name` | `text` | NO | - | 称号名 (ブロンズ/シルバー/ゴールド/マスター) |
| `storage_path` | `text` | NO | - | Storageバケット内のファイルパス |
| `created_at` | `timestamptz` | YES | `now()` | - |

### 2.9 `quiz_scores` (クイズ成績データ)
来場者ごとのクイズ最高スコア・累計スコアを記録します。
| Column | Type | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `user_id` | `uuid` | NO | - | PK, FK (`users.user_id`) |
| `highest_score` | `integer` | YES | `0` | 1回あたりの最高正解数 |
| `total_score` | `integer` | YES | `0` | 累計正解数 (ランキング基準) |
| `play_count` | `integer` | YES | `0` | 総プレイ回数 |
| `updated_at` | `timestamptz` | YES | `now()` | 最終プレイ日時 |

### 2.10 `news` (お知らせ)
トップページ等に表示するシステムお知らせです。
| Column | Type | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `news_id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `title` | `text` | NO | `''` | タイトル |
| `content` | `text` | NO | - | お知らせ本文 |
| `is_important` | `boolean` | YES | `false` | 重要表示フラグ |
| `is_active` | `boolean` | YES | `true` | 公開フラグ |
| `created_at` | `timestamptz` | YES | `now()` | 作成日時 |
| `updated_at` | `timestamptz` | YES | `now()` | 更新日時 |

### 2.11 `operation_logs` (運営・管理操作ログ)
運営者・管理者の操作履歴を保持します。
| Column | Type | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `log_id` | `uuid` | NO | `gen_random_uuid()` | PK |
| `operator_id` | `text` | YES | - | 操作主体 (`class_id` または `admin`) |
| `action` | `text` | NO | - | 操作内容 (例: "UPDATE_CONGESTION") |
| `details` | `jsonb` | YES | - | 変更詳細データ |
| `performed_at` | `timestamptz` | YES | `now()` | 実行日時 |

### 2.12 `system_settings` (システム機能制御)
機能トグル（整理券の全校受発券制限、クイズ機能のON/OFF等）を集中管理します。
| Column | Type | Nullable | Default | Constraints / Description |
| :--- | :--- | :--- | :--- | :--- |
| `key` | `text` | NO | - | PK (例: `'fastpass_enabled'`) |
| `value` | `jsonb` | NO | - | 設定値 (JSON) |
| `description` | `text` | YES | - | 設定の説明 |
| `updated_at` | `timestamptz` | YES | `now()` | 最終更新日時 |

---

## 3. Database Functions (RPC) 一覧

主要なアトミック操作を提供するストアドプロシージャ群です。

| 関数名 | 役割 / 概要 |
| :--- | :--- |
| `operator_login(class_id, password)` | 運営クラスログイン認証およびトークン発行 |
| `operator_update_congestion(class_id, project_id, level)` | 運営者による自企画の混雑度更新 |
| `operator_update_project(...)` | 運営者による自企画の説明・画像更新 |
| `admin_update_congestion(...)` | 管理者による混雑度の一括更新 |
| `admin_update_slot_capacity(slot_id, capacity)` | 管理者によるファストパス枠定員の変更 |
| `admin_toggle_project_fastpass(...)` | 企画ごとのファストパス有効化切替 |
| `issue_fastpass_ticket(p_slot_id, p_user_id)` | **ファストパス発券** (定員チェック・二重発券防止の排他制御) |
| `cancel_fastpass_ticket(p_ticket_id, p_user_id)` | 発券済みファストパスのキャンセル |
| `verify_and_use_ticket(p_qr_token, p_class_id)` | **運営者によるQR照合・消し込み** |
| `discard_expired_fastpass_ticket()` | 期限切れファストパスの自動破棄処理 |
| `get_projects_with_status()` | 混雑度・待ち時間を結合した全企画取得 |
| `get_estimated_wait_time(project_id)` | 混雑度と回転率に基づく推定待ち時間計算 |
| `get_quiz_questions()` | 長田検定問題のランダム10問取得 |
| `submit_quiz_score(p_score, p_signature)` | **クイズスコア登録・検証** (最高/累計更新) |
| `get_quiz_ranking()` | 累計スコア上位ランキングの取得 |
| `handle_new_user()` | Supabase Auth 新規ユーザー作成時の `users` 自動追加トリガー |

---

## 4. Row Level Security (RLS) & アクセス制御

- **原則**: 全テーブルで `ENABLE RLS` が有効化されています。
- **Public/Guest**:
  - `projects`, `congestion`, `fastpass_slots`, `news`, `quiz_questions` は全ユーザー `SELECT` 許可。
  - `fastpass_tickets`, `quiz_scores` は `user_id = auth.uid()` の本人のみ `SELECT` 許可。
  - **直接の `INSERT` / `UPDATE` は原則禁止**（RPC 経由の実行に限定）。
- **Admin (`role = 'admin'`)**:
  - すべてのテーブルに対して `ALL` (SELECT, INSERT, UPDATE, DELETE) 権限を保持。

---

## 5. Supabase Storage バケット

1. **`public-assets`** (Public バケット)
   - アクセス制限: 全ユーザー参照可。
   - 保存内容: 会場マップ (`venue-map-booth.webp`)、タイムテーブル (`timetable-stage.webp`)。
2. **`quiz-rewards`** (Private バケット)
   - アクセス制限: 直接閲覧不可。RPC `get_quiz_reward_url` を経由した**署名付き URL (Signed URL)** 経由で提供。
   - 保存内容: 限定壁紙 (`bronze_Nagata_WP.webp`, `silver_Nagata_WP.webp`, etc.)。

---

## 6. データベースに関する TODO / 要確認事項

- [ ] **古い未接続テーブルの削除検討**: `quiz_sessions` など過去に使用されていた不要なテーブルの完全クリーンアップ判定。【要確認】
- [ ] **高負荷時インデックスチューニング**: `fastpass_tickets (slot_id, user_id, used)` 複合インデックスの最適化検証。【TODO】
