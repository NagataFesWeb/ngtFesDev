# NgtFes26 (長田高校文化祭 Webアプリケーション)

長田高校文化祭のための総合Webアプリケーションプロジェクトです。
来場者向けの企画案内・リアルタイム混雑状況の閲覧・ファストパス（整理券）発券・長田検定（クイズ）機能と、各クラス・有志団体向けの運営者ダッシュボード、全校の状況を統括する管理者ダッシュボードを提供します。

---

## 📋 技術スタック (Tech Stack)

- **フロントエンド / フレームワーク**: [Next.js 16 (App Router)](https://nextjs.org/) (React 19, TypeScript)
- **スタイリング**: [Tailwind CSS 4](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/) (Radix UI), [Lucide React](https://lucide.react.dev/)
- **バックエンド / データベース**: [Supabase](https://supabase.com/) (PostgreSQL, Supabase Auth, Storage, Realtime)
- **状態管理 / データ取得**: [TanStack Query (React Query) v5](https://tanstack.com/query/latest), React Context API
- **テスト**: [Vitest](https://vitest.dev/)
- **デプロイ・ホスティング**: [Vercel](https://vercel.com/) (Vercel Analytics & Speed Insights)

---

## 🚀 主要機能概要 (Key Features)

### 1. 来場者機能 (Visitor)
- **トップページ (`/`)**: 最新のお知らせ（News）表示、主要コンテンツへの導線ナビゲーション。
- **企画一覧 & 検索 (`/projects`)**:
  - クラス展示・食品・ステージ等のカテゴリ切替。
  - リアルタイム混雑状況（LVL 1: 空き / LVL 2: やや混雑 / LVL 3: 混雑）および推定待ち時間の可視化。
- **企画詳細 (`/projects/[id]`)**: 企画説明、開催場所、スケジュール、画像閲覧。
- **ファストパス (整理券) 発券 (`/projects/[id]`)**:
  - 発券枠（Time Slot）ごとのリアルタイム残り枚数表示。
  - 発券後のマイページ保存、QRコード表示、およびキャンセル機能。
- **長田検定 (クイズ) (`/quiz`)**:
  - 10問のランダム出題とクライアントサイド採点。
  - 累計スコアに応じた称号獲得および限定壁紙（`quiz-rewards`）の閲覧・ダウンロード。
  - リアルタイムランキング表示。
- **マイページ (`/mypage`)**: 取得済み整理券のQRコード表示、ニックネーム変更。

### 2. 運営者機能 (Operator)
- **運営者ログイン (`/operator/login`)**: クラスIDとパスワードによるログイン認証。
- **運営ダッシュボード (`/operator/dashboard`)**:
  - **混雑状況更新**: 自企画の混雑度（LVL 1〜3）をリアルタイム更新。
  - **整理券QRスキャン**: カメラ機能を用いた整理券QRコードの読み取り・消し込み処理。
  - **企画情報編集**: 自企画の説明文や画像の変更（Supabase Storageアップロード）。

### 3. 管理者機能 (Admin)
- **管理者ログイン (`/admin/login`)**: 管理者権限を持つアカウントでログイン。
- **管理者ダッシュボード (`/admin/dashboard`)**:
  - **混雑状況統括**: 全企画の混雑状況の一覧確認および代理更新。
  - **ファストパス枠管理**: 各企画の時間枠ごとの定員（Capacity）調整。
  - **システム機能制限 (Feature Toggles)**: 整理券・クイズ機能等の個別ON/OFF制御。
  - **お知らせ管理**: トップページお知らせの投稿・編集・削除。
  - **データリセット**: テストデータの初期化機能。

---

## 🛠 セットアップ手順 (Setup Guide)

### 1. 必須条件 (Prerequisites)
- **Node.js**: `v18.0.0` 以上 (推奨: `v20` LTS)
- **npm**: Node.js に付属
- **Supabase アカウント**: データベース・認証・Storage用

### 2. リポジトリのクローンと依存関係のインストール

```bash
git clone <repository-url>
cd ngtFesDev
npm install
```

### 3. 環境変数の設定

ルート直下に `.env.local` を作成し、Supabase の接続情報を記述します。

```ini
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. データベースの初期化 (Database Setup)

本プロジェクトでは Supabase 上でスキーマ、RLSポリシー、RPC関数を定義します。

**方法 A: Supabase Dashboard から実行（推奨）**
1. Supabase Dashboard の **SQL Editor** を開きます。
2. `supabase/full_setup.sql` の内容をコピーして貼り付け、実行します。

**方法 B: Supabase CLI からマイグレーションを適用**
```bash
npx supabase db push
```

### 5. Storage バケットの準備 (Storage Setup)

Supabase Storage に以下の 2 つのバケットを作成します：

1. **`public-assets` (Public: ON)**
   - 用途: 会場マップ (`venue-map-booth.webp`)、タイムテーブル (`timetable-stage.webp`) などの共有画像。
2. **`quiz-rewards` (Public: OFF / 署名付きURL運用)**
   - 用途: 長田検定のクイズ報酬壁紙 (`bronze_Nagata_WP.webp`, `silver_Nagata_WP.webp`, `gold_Nagata_WP.webp`, `master_Nagata_WP.webp`)。

### 6. 開発サーバーの起動

```bash
npm run dev
```
ブラウザで [http://localhost:3000](http://localhost:3000) にアクセスします。

---

## 📜 コマンドリファレンス (Available Scripts)

- `npm run dev`: 開発サーバーの起動 (ローカルバインド: `-H 0.0.0.0`)
- `npm run build`: プロダクションビルドの実行
- `npm run start`: プロダクションサーバーの起動
- `npm run lint`: ESLint によるコードチェック
- `npm run type-check`: TypeScript の型チェック
- `npm run test`: Vitest による単体テストの実行

---

## 🔑 主要ルーティング一覧 (Routes)

| パス | 説明 | 認証 |
| :--- | :--- | :--- |
| `/` | トップページ（お知らせ・メインメニュー） | 不要 |
| `/projects` | 企画一覧（混雑状況・検索・フィルタ） | 不要 |
| `/projects/[id]` | 企画詳細・ファストパス発券 | 一部要 (発券時) |
| `/quiz` | 長田検定（クイズ・ランキング・報酬） | 不要 (ログイン推奨) |
| `/mypage` | マイページ（所持整理券QR表示・ニックネーム変更） | 必要 |
| `/operator/login` | 運営者ログイン | 不要 |
| `/operator/dashboard` | 運営者ダッシュボード | 運営者認証 |
| `/admin/login` | 管理者ログイン | 不要 |
| `/admin/dashboard` | 管理者ダッシュボード | 管理者認証 |

---

## 🌲 Git ブランチ・コミット運用規則

- `main`: 保護ブランチ（安定版コード）
- 開発用ブランチプレフィックス:
  - `feature/`: 新機能開発 (`feature/quiz-reward-ui`)
  - `fix/`: バグ修正 (`fix/fastpass-qr-scanner`)
  - `refactor/`: リファクタリング
  - `docs/`: ドキュメント更新

---

## ❓ TODO / 要確認事項

- [ ] **本番ドメイン・Vercel環境変数設定**: 本番運用のドメイン確定および Vercel Dashboard 上の環境変数の整合性確認。【要確認】
- [ ] **高負荷時コネクションプール最適化**: 3,000名同時アクセス想定時の Supabase Connection Pooler (Port 6543) の本番接続検証。【TODO】
- [ ] **実機カメラQRコードスキャンの動作検証**: モバイル端末（iOS Safari / Android Chrome）でのカメラパーミッション挙動の完全テスト。【要確認】
