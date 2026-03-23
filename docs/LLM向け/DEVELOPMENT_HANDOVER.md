# NgtFes26 Development Handover Guide

このドキュメントは、これまでの開発プロセス、現在の状況、および今後の開発のために必要な情報をまとめたものです。
AIアシスタントや新しい開発者がプロジェクトを引き継ぐ際に参照してください。

## 1. プロジェクト概要 (Project Overview)
**Project Name**: NgtFes26 (Nagata High School Festival 2026 Web App)
**Purpose**: 文化祭の来場者向け機能（混雑状況、ファストパス、投票、クイズ）と、運営・管理者向けダッシュボードの提供。
**Root Directory**: `ngtFesDev` (ユーザーワークスペース直下ではない点に注意: `.../NgtFes26/ngtFesDev`)

## 2. 技術スタック (Tech Stack)
- **Framework**: Next.js 16.1.1 (App Router, Turbopack)
- **Language**: TypeScript
- **Database / Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Styling**: Tailwind CSS
- **UI Component**: shadcn/ui, Lucide React
- **State Management**: React Query (TanStack Query), Context API (Session, Operator)
- **External API**: None (ID/Password Auth only)

## 3. 現在の実装状況 (Current Status)

### 3.1 来場者機能 (Visitor Features)
- **トップページ (`/`)**: お知らせ表示、メニュー。
- **企画一覧 (`/projects`)**: 
    - 全企画の表示（クラス/食品/ステージなどタブ切り替え）。
    - リアルタイム混雑状況の表示 (LVL1~3)。
    - 推定待ち時間の表示（バッジ）。
- **企画詳細 (`/projects/[id]`)**:
    - 企画情報、画像。
    - **投票機能**: 1カテゴリにつき1票（Supabase RPC `cast_vote` で制御）。未ログイン時はログインへリダイレクト。
    - **整理券(FastPass)**: 発券機能（Supabase RPC `issue_fastpass_ticket`）。未ログイン時はログインへリダイレクト。
- **長田検定 (`/quiz`)**:
    - クイズプレイ、結果表示、ランキング表示（合計スコア順）。
    - 未ログイン時はログインへリダイレクト。
- **マイページ (`/mypage`)**:
    - 取得した整理券（QRコード）の表示。
    - ニックネーム編集。

### 3.2 運営者機能 (Operator Features)
- **ログイン (`/operator/login`)**: クラスIDとパスワードでログイン。
- **ダッシュボード (`/operator/dashboard`)**:
    - **混雑状況更新**: 自クラスの混雑度を3段階（空き/普通/混雑）で更新。
    - **QRスキャン**: 来場者の整理券QRをカメラで読み取り、消し込みを行う (`verify_and_use_ticket`)。
    - **情報編集**: 自クラスの説明文と画像の編集（Supabase Storageへアップロード）。

### 3.3 管理者機能 (Admin Features)
- **ログイン (`/admin/login`)**: 管理者権限を持つユーザーのみアクセス可。
- **ダッシュボード (`/admin/dashboard`)**:
    - **混雑状況管理**: 全企画の混雑状況を一覧で確認・変更。
    - **整理券管理 (FastPass)**: 各時間帯の発行枠数(Capacity)の調整。
    - **システム設定 (System Settings)**: 投票・クイズ・整理券機能の全体ON/OFF切り替え（Feature Toggles）。
    - **お知らせ管理 (News)**: トップページに表示するお知らせの作成・削除。
    - **データリセット**: テスト用データの全削除機能。

## 4. データベース設計と構築 (Database & Setup)

### 4.1 重要テーブル (Key Tables)
- `users`: 来場者情報。Role ('guest', 'admin')。
- `classes`: 運営クラス・団体のアカウント情報。
- `projects`: 各企画のマスターデータ（`rotation_time_min`, `max_queue_size` 含む）。
- `congestion`: 各企画のリアルタイム混雑度 (Project 1:1)。
- `fastpass_slots`: 整理券の時間枠と在庫数 (Project 1:N)。
- `fastpass_tickets`: 発行された整理券 (Slot 1:N)。
- `votes`: 投票データ (User * Category Unique)。
- `quiz_scores`: クイズのスコア実績（Highest/Total）。
- `news`: お知らせデータ。
- `system_settings`: 機能制限フラグ。

### 4.2 セットアップ手順 (Setup Instructions)
データベースの構築には、**SupabaseのSQL Editor**で以下のスクリプトを**順に**実行する必要があります。
(ローカル開発環境ではなく、リモートのSupabaseプロジェクトに対して実行することを想定しています)

1.  **初期構築**: `supabase/migrations/20251231190000_init_schema.sql`
2.  **修正・追加**: `supabase/migrations/20260103130000_fix_news_and_schema.sql`
3.  **RPC追加(必須)**:
    - `supabase/migrations/20260103100000_add_wait_time.sql`
    - `supabase/migrations/20260103103000_add_list_rpc.sql`
    - `supabase/migrations/20260103110000_update_ranking_rpc.sql`
    - `supabase/migrations/20260103120000_create_news_table.sql`
4.  **データ投入**:
    - `supabase/seed.sql` (基本)
    - `supabase/migrations/20260103140000_add_more_seed_data.sql` (拡充)
    - `supabase/seed_slots.sql` (整理券枠)

### 4.3 環境変数
`ngtFesDev/.env.local` に以下を設定:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (本来はクライアントサイドで使いませんが、シードスクリプト等で必要になる場合あり)

## 5. 既知の課題と今後の作業 (Remaining Tasks)

### ドキュメント参照
- `docs/SPEC_FIX_TODO.md`: 最新の修正タスクリスト。ほぼ完了していますが、確認用として残りを確認してください。
- `implementation_plan.md`: 実装計画の履歴。

### 未完了・要確認事項
- **ランキング仕様の最終確認**: `get_quiz_ranking` は `total_score` 順に変更済みですが、UI上で `highest_score` と `total_score` の表示バランスが適切か確認が必要かもしれません。
- **本番デプロイ準備**: Vercel等へのデプロイ時の環境変数設定。
- **LINEログイン**: 廃止。ID/Password認証に移行済み。

## 6. コマンドリファレンス
- 開発サーバー起動: `npm run dev` in `TestWeb` directory.
- `docs` フォルダに関連ドキュメントが集約されています。
