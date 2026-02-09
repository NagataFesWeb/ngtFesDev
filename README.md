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

## 🌳 ブランチ命名規則 (Branch Naming Convention)

開発をスムーズに進めるため、以下の命名規則に従ってブランチを作成してください。

| プレフィックス | 説明 | 例 |
| :--- | :--- | :--- |
| `feature/` | 新機能の開発 | `feature/add-login-page`, `feature/user-profile` |
| `fix/` | バグ修正 | `fix/header-layout`, `fix/login-error` |
| `hotfix/` | 緊急のバグ修正（本番環境など） | `hotfix/critical-security-patch` |
| `refactor/` | リファクタリング（機能追加・修正なし） | `refactor/api-client`, `refactor/cleanup-components` |
| `docs/` | ドキュメントのみの変更 | `docs/update-readme`, `docs/api-spec` |
| `test/` | テストの追加・修正 | `test/add-unit-tests`, `test/e2e-login-flow` |

### 📌 その他のルール
*   **英語小文字**を使用してください。
*   単語の区切りは**ハイフン (`-`)** を使用してください。
*   わかりやすい名前をつけてください（`feature/test` などは避ける）。

## 🔰 GitHub 初心者向けワークフロー (Git Workflow for Beginners)

開発の流れをステップごとに説明します。

### 💻 コマンドラインで行う場合 (CLI)

1. **リポジトリの取得 (Clone)**
   ```bash
   git clone <repository-url>
   cd <project-folder>
   ```

2. **最新状態の取得 (Pull)**
   作業を始める前に、必ずリモートの最新状態を取り込みます。
   ```bash
   git checkout main
   git pull origin main
   ```

3. **ブランチの作成 (Create Branch)**
   上記の命名規則に従ってブランチを作成し、移動します。
   ```bash
   git checkout -b feature/my-new-feature
   ```

4. **変更のコミット (Commit)**
   作業が一区切りついたら、変更を保存します。
   ```bash
   git add .
   git commit -m "機能XXを追加しました"
   ```
   *   コミットメッセージはわかりやすく書きましょう。

5. **リモートへ送信 (Push)**
   ```bash
   git push origin feature/my-new-feature
   ```

6. **プルリクエストの作成 (Create Pull Request)**
   GitHub上で "Compare & pull request" ボタンを押し、変更内容の説明を書いてPRを作成します。
   *   レビュアーを指定し、確認・承認をもらってからマージします。

### 🎨 VS Codeを使用する場合 (Using VS Code)

VS Codeの標準機能を使って、GUIでGit操作を行うこともできます。

1. **リポジトリの取得**
   *   `F1`キーを押してコマンドパレットを開き、`Git: Clone` と入力して選択します。
   *   リポジトリのURLを入力し、保存先フォルダを選択します。

2. **ブランチの作成・切り替え**
   *   左下のステータスバーにあるブランチ名（`main` など）をクリックします。
   *   「新しいブランチの作成... (Create new branch...)」を選択し、ブランチ名を入力します（例: `feature/my-new-feature`）。

3. **変更の確認とコミット**
   *   左側のサイドバーにある **ソース管理 (Source Control)** アイコン（枝分かれした線のようなアイコン）をクリックします。
   *   **変更 (Changes)** リストにあるファイルの `+` ボタンを押して、変更をステージング（`git add` に相当）します。
   *   テキストボックスにコミットメッセージを入力し、**コミット (Commit)** ボタンを押します。

4. **変更の同期 (Push/Pull)**
   *   左下のステータスバーにある「変更の同期 (Synchronize Changes)」アイコン（回転する矢印）をクリックすると、PushとPullが同時に行われます。
   *   初回Push時は、「このブランチを公開しますか？」と聞かれるので「OK」を選択します。

### ⚠️ 注意点 (Important Notes)
*   **mainブランチに直接pushしない**: 必ずブランチを切って作業してください。
*   **こまめにPullする**: 他の人の変更を取り込むため、`git pull origin main` (自分のブランチにマージする場合) を定期的に行いましょう。
*   **機密情報をcommitしない**: APIキーやパスワードなどは `.env` ファイルに記述し、`.gitignore` に含まれていることを確認してください。
