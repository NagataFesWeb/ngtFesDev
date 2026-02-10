# 開発To-Doリスト (Development Roadmap)

本ドキュメントは、`docs/仕様書.md` および関連仕様書に基づき、バックエンドからフロントエンド完成までの詳細なタスクをまとめたものです。
このリストに沿って開発を進めてください。

---

## Phase 1: 環境構築 & 基盤実装 (Environment & Foundation)

### 1.1 プロジェクト初期化
- [x] **Next.js プロジェクト作成** (すでに存在する場合は設定確認)
    - [x] TypeScript, ESLint, Prettier の設定確認
    - [x] ディレクトリ構成の整理 (`src/app`, `src/components`, `src/lib`, `src/types`)
- [x] **Supabase プロジェクト作成** (またはローカル環境 `npx supabase start`)
    - [x] `config.toml` の確認
    - [x] 環境変数 (`.env.local`) の設定 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

### 1.2 共通ライブラリ・スタイリング設定
- [x] **Tailwind CSS 設定** (または CSS Modules)
    - [x] `tailwind.config.js` のテーマ設定 (フォント、カラーパレット)
    - [x] `globals.css` のベーススタイル定義
- [x] **UIコンポーネントライブラリ導入** (必要であれば Shadcn/ui 等)
- [x] **アイコンライブラリ導入** (Lucide React / Heroicons 等)
- [x] **状態管理ライブラリ導入** (SWR または TanStack Query)

---

## Phase 2: データベース & バックエンド実装 (Database & Backend)

### 2.1 テーブル作成 (Physical Design)
`docs/バックエンド仕様書.md` に基づき、Migrationファイルを作成および適用する。

- [x] `users` テーブル (来場者管理)
- [x] `classes` テーブル (運営クラス)
- [x] `projects` テーブル (企画情報)
- [x] `congestion` テーブル (混雑状況)
- [x] `fastpass_slots` テーブル (FP時間枠)
- [x] `fastpass_tickets` テーブル (FPチケット)
- [x] `quiz_sessions` テーブル (クイズセッション)
- [x] `quiz_scores` テーブル (クイズスコア)
- [x] `quiz_questions` テーブル (クイズ問題マスタ)
- [x] `operation_logs` テーブル (操作ログ)

### 2.2 RLS (Row Level Security) ポリシー適用
`docs/バックエンド仕様書.md` の "3. RLS ポリシー設計" に従う。

- [x] 全テーブルに対して `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- [x] **Public (Anon) 閲覧権限**: `projects`, `congestion`, `fastpass_slots`
- [x] **User (Authenticated) 権限**: `users`, `fastpass_tickets` (自身のデータのみ)
- [x] **更新権限の制限**: 直接の `INSERT/UPDATE` を禁止し、原則RPC経由とする設定

### 2.3 Database Functions (RPC) 実装
`docs/バックエンドAPI仕様書.md` に基づき、PostgreSQL関数を実装する。

- [x] **認証関連**:
    - [x] `operator_login`: クラスID/PASSで運営者トークン発行
- [x] **ファストパス関連**:
    - [x] `issue_fastpass_ticket`: トランザクション・排他制御付き発券
    - [x] `verify_and_use_ticket`: QRコード検証・消込
- [x] **クイズ関連**:
    - [x] `start_quiz_session`: ランダム出題・セッション開始
    - [x] `submit_quiz_score`: 採点・スコア登録
- [x] **運営・管理関連**:
    - [x] `admin_update_congestion`: 強制更新（混雑状況更新の唯一のRPC）
    - [x] `admin_reset_all_data`: データ初期化

### 2.4 シードデータ投入
- [x] テスト用クラス (`classes`) データ
- [x] テスト用企画 (`projects`) データ
- [x] テスト用クイズ問題 (`quiz_questions`)

---

## Phase 3: フロントエンド - 共通基盤 (Frontend Foundation)

### 3.1 認証コンテキスト実装
- [x] **SessionContext (Visitor)**: Supabase Auth Session の監視・保持
- [x] **OperatorContext (Operator)**: 運営者トークンの保持・永続化 (Storage)

### 3.2 共通コンポーネント作成
- [x] Layout: Header (ハンバーガーメニュー含む), Footer
- [x] UI Parts: Button, Card, Modal, Input, Badge
- [x] **StatusIcon**: 混雑度表示用アイコン (顔マーク 3段階)
- [x] **LoadingSpinner / ErrorMessage**: 共通ステータス表示

### 3.3 Supabase Client Helper
- [x] typed supabase client の作成 (`src/lib/supabase.ts`)
- [x] Database型定義の生成 (`supabase gen types`)

---

## Phase 4: フロントエンド - 来場者機能 (Visitor Features)

### 4.1 トップページ・企画一覧 (`/`, `/projects`)
- [x] **Top Page**: KV, メニューリンク, お知らせ (Mock)
- [x] **企画一覧**:
    - [x] タブ切り替え (クラス/食品/ステージ/展示)
    - [x] `projects` テーブルからのデータ表示
    - [x] **Realtime**: `congestion` テーブルの変更検知・反映

### 4.2 企画詳細・アクション (`/projects/[id]`)
- [x] **詳細表示**: 画像, 説明, 現在の混雑度
- [x] **整理券取得**: `issue_fastpass_ticket` RPC 呼び出し

### 4.3 マイページ・LINE認証 (`/mypage`, `/login/callback`)
- [x] **LINE認証基盤実装**:
    - [x] Login Page (Mock Email/Pass + Setup for OAuth)
    - [x] (Edge Function) `verify_line_token` (Replaced with Supabase Auth + Trigger)
- [x] LINE認証コールバック処理 (Supabase handled)
- [x] プロフィール設定 (ニックネーム) - (Via Trigger default)
- [x] **取得済みチケット表示**:
    - [x] QRコード生成 (`qrocode.react` 等)
    - [x] 使用済みチケットの除外/グレーアウト

### 4.4 長田検定 (`/quiz`)
- [x] **検定トップ**: スタートボタン
- [x] **プレイ画面**:
    - [x] ランダム出題 (Client fetch)
    - [x] 回答UI
- [x] **結果画面**:
    - [x] スコア表示 (`submit_quiz_score` RPC Integration)送信
    - [x] ランキング表示 (`get_quiz_ranking` RPC Integration)

---

## Phase 5: フロントエンド - 運営・管理機能 (Operator/Admin Features)

### 5.1 運営者用機能 (`/operator/*`)
- [x] **運営者ログイン**: クラスID/Passによる認証 (`operator_login`)
- [x] **ダッシュボード**:
    - [x] **QR読み取り**: カメラ起動or手動入力 -> `verify_and_use_ticket` RPC
    - [x] 成功/失敗のフィードバックUI

### 5.2 管理者用機能 (`/admin/*`)
- [x] **管理者ログイン**: Email/Pass認証
- [x] **ダッシュボード**:
    - [x] **データリセット**: 開発用/当日リセット用 (`admin_reset_all_data`)
    - [x] **緊急操作**: 任意の企画の混雑度変更 (Impl in RPC, UI TBD/Optional - *Implemented manual reset, chaos mode reserved*)

---

## Phase 6: デプロイ・運用準備 (Deployment)

- [ ] **Vercelへのデプロイ**:
    - [ ] Environment Variables 設定
    - [ ] Build & Deploy
- [ ] **動作確認**:
    - [ ] 本番環境でのRealtime動作
    - [ ] 実機でのQR読み取りテスト
- [ ] **シナリオテスト (Visitor)**:
    - [ ] LINEログイン -> 詳細ページ -> FP発券 -> マイページで確認
    - [ ] クイズプレイ -> ランキング反映
- [ ] **シナリオテスト (Operator)**:
    - [ ] QR読取 -> 入場判定成功
- [ ] **シナリオテスト (Admin)**:
    - [ ] 全データリセット -> 正常にクリアされるか
### 6.2 非機能要件チェック
- [ ] **ネットワーク遮断テスト**: オフライン時の表示崩れ確認
- [ ] **レート制限テスト**: 混雑度連打時のエラーハンドリング
- [ ] **画像最適化**: アップロード画像のサイズ確認

### 6.3 デプロイ
- [ ] 環境変数の本番設定
- [ ] Vercel へのデプロイ
- [ ] LINE Login Developer Console の Callback URL 設定変更
