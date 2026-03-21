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
cd ngtFesDev
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
本プロジェクトでは、すべてのスキーマ定義、必要なRPC関数、およびシードデータが1つのSQLファイルに統合されています。

以下のいずれかの方法で、**`supabase/full_setup.sql`** を実行してデータベースを初期化してください。

**方法A: Supabase Dashboardから実行する（推奨）**
1. **Supabase Dashboard > SQL Editor** を開きます。
2. `supabase/full_setup.sql` の内容をコピーし、エディタに貼り付けて実行（Run）します。

**方法B: CLI (psql) を使用して実行する**
ターミナルで以下のコマンドを実行し、ファイルを適用します。
実行前に、`<YOUR_DB_PASSWORD>` や `<YOUR_PROJECT_REF>` をご自身のSupabaseプロジェクトの情報に書き換えてください。

```bash
# PGPASSWORD環境変数を設定してpsqlコマンドを実行します
PGPASSWORD="<YOUR_DB_PASSWORD>" psql -h db.<YOUR_PROJECT_REF>.supabase.co -p 5432 -d postgres -U postgres -f supabase/full_setup.sql
```

> [!NOTE]
> `full_setup.sql` には、必要なマイグレーション手順と初期データがすべて含まれています。これを実行するだけで、必須テーブルの構築からクイズ機能・ファストパスの初期設定までが完了します。

### 6. クイズ報酬（壁紙）のセットアップ (Storage Setup)

クイズの累計スコア報酬として配布する壁紙画像をSupabase Storageに配置する必要があります。

1.  **バケットの作成**:
    *   Supabase Dashboardの **Storage** を開き、`quiz-rewards` という名前のバケットを作成してください。
    *   **Public access** は **OFF**（非公開）に設定してください。
2.  **画像のアップロード**:
    *   以下の4つのファイルを `quiz-rewards` バケットの**ルート直下**にアップロードしてください。
    *   ファイル名は**完全に一致**している必要があります：
        *   `bronze_Nagata_WP.png`
        *   `silver_Nagata_WP.png`
        *   `gold_Nagata_WP.png`
        *   `master_Nagata_WP.png`

> [!NOTE]
> 画像アセットがない場合は、ダミー画像を配置するか、開発者に確認してください。

### 7. 開発サーバーの起動

以下のコマンドで開発サーバーを起動します。

```bash
npm run dev
```


#### (i) PCでのアクセス方法

起動後、ブラウザで以下にアクセスしてください。

```
http://localhost:3000
```


#### (ii) モバイル端末・他デバイスからのアクセス方法

実機テスト（カメラ機能やレスポンシブ確認）を行う場合は、以下のいずれかの方法を利用してください。

### 方法A：同一Wi-Fi経由でアクセスする

PCとモバイル端末を同じWi-Fiに接続し、PCのIPアドレスを使用してアクセスします。

#### 1. IPアドレスを確認する
- **Windows**: `ipconfig` を実行し **IPv4 アドレス** を確認  
- **Mac**: `ifconfig` またはシステム設定から確認  

#### 2. スマホでアクセスする
- ブラウザで `http://[PCのIPアドレス]:3000` を開く
  - 例) `http://192.168.1.15:3000`


### 方法B：VS Codeのポート転送機能を利用する（HTTPS必須の場合）

QRコードの読み取り（カメラ起動）など、HTTPS通信が必要な機能をテストする際に使用します。

1. VS Code下部パネルの **[ポート (Ports)]** タブを選択。  
2. **[ポートの前方参照 (Forward a Port)]** をクリックし、`3000` を入力。  
   > ※初回利用時には「GitHubへのサインイン」を求められる場合があります。案内に従って連携してください。
3. 追加された項目を右クリックし、以下を設定します：
   - **[ポートプロトコルの変更 (Change Port Protocol)]** を **[HTTP]** に変更。
   - **[ポートの表示範囲 (Port Visibility)]** を **[パブリック (Public)]** に変更。
4. **[転送されたアドレス]** に表示される `https://...` のURLにスマホからアクセス。  
   > ※「パブリック」にすると、URLを知っている人なら誰でもあなたの開発画面にアクセスできるようになります。作業が終わったら、VS Codeを閉じるか転送を停止するのを忘れないようにしましょう。

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
