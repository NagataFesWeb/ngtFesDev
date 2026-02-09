# NgtFes26 Cultural Festival Web Application

長田高校（文化祭）のためのWebアプリケーションプロジェクトです。
来場者向けの混雑状況確認・ファストパス発券機能と、運営・管理者向けのダッシュボード機能を提供します。

## 📋 必須要件 (Prerequisites)

実行には以下のソフトウェアが必要です。
- **Node.js**: v18以降
- **npm**: Node.jsに含まれています
- **Supabase Account**: データベースおよび認証機能に使用

## 🚀 セットアップ手順 (Setup Guide)

### 1. プロジェクトの準備

```bash
# プロジェクトフォルダへ移動
cd TestWeb
```

### 2. 依存パッケージのインストール

```bash
npm install
```

### 3. 環境変数の設定

Supabaseへの接続情報を設定します。
ルートディレクトリにある `.env.local` ファイルを作成（または `.env.example` をコピー）し、以下の内容を設定してください。

**`.env.local`:**
```ini
NEXT_PUBLIC_SUPABASE_URL=あなたのSupabaseプロジェクトURL
NEXT_PUBLIC_SUPABASE_ANON_KEY=あなたのSupabase Anon Key
SUPABASE_SERVICE_ROLE_KEY=あなたのSupabase Service Role Key (Backend用)
```

### 4. データベースの準備 (Database Setup)

Supabaseプロジェクトにテーブル定義と初期データを適用する必要があります。
**Supabase Dashboard > SQL Editor** を開き、以下の順序でSQLスクリプトを実行してください。

1.  **初期スキーマの適用**:
    *   `supabase/migrations/20251231190000_init_schema.sql`
    *   `supabase/migrations/20260103130000_fix_news_and_schema.sql` (テーブル修正・ヘルパー関数)

2.  **RPC（機能）の追加**:
    *   `supabase/migrations/20260103100000_add_wait_time.sql` (待ち時間計算)
    *   `supabase/migrations/20260103103000_add_list_rpc.sql` (プロジェクト一覧取得)
    *   `supabase/migrations/20260103110000_update_ranking_rpc.sql` (ランキングロジック)

3.  **基礎データの投入 (重要)**:
    *   `supabase/seed.sql` (基本データ)
    *   `supabase/migrations/20260103140000_add_more_seed_data.sql` (追加シードデータ: 2年・3年)
    *   *(任意)* `supabase/seed_slots.sql` (整理券スロットデータ)

### 5. 開発サーバーの起動

以下のコマンドで開発サーバーを起動します。

```bash
npm run dev
```

起動後、ブラウザで [http://localhost:3000](http://localhost:3000) にアクセスしてください。

## 🔑 主要なアクセスURL

- **トップページ（来場者用）**: `/`
- **管理者ログイン**: `/admin/login`
- **運営者ログイン**: `/operator/login`
- **長田検定**: `/quiz`
- **企画一覧**: `/projects`

## 🛠 主な機能

*   **管理者ダッシュボード**:
    *   全企画の混雑状況一括管理
    *   整理券の発行枚数・枠設定
    *   システム全体のお知らせ管理
    *   機能制限（投票・クイズ・FPのON/OFF）
*   **運営者ダッシュボード**:
    *   自クラスの混雑状況更新（LVL1～LVL3）
    *   整理券QRコードの読み取り
*   **来場者機能**:
    *   企画の検索・待ち時間確認
    *   整理券（ファストパス）の取得
    *   企画への投票（部門ごとに1票）
    *   長田検定クイズ
