# Vercel デプロイ・運用完全マニュアル (Windows/CLI対応)

## 0. 事前準備 (Windowsユーザー向け)
コマンドプロンプト、PowerShell、または VS Code のターミナルを使用します。
Vercel CLI が未インストールの場合は以下を実行してください。
$ npm i -g vercel

---

## 1. プロジェクトの初期設定 (Vercel CLI)
プロジェクトのルートディレクトリで以下を実行します。

$ vercel

### 対話型プロンプトの回答指針:
- Set up and deploy? [y/N]: y
- Which scope?: (自分のアカウントまたはチームを選択)
- Link to existing project? [y/N]: N (新規作成の場合)
- What’s your project’s name?: (プロジェクト名を入力)
- In which directory is your code located?: ./
- Want to modify settings? [y/N]: N
- Detected a repository. Connect it to this project? [y/N]: n
  (CLIからの制御を優先する場合。GitHub連携は後からブラウザでも可能です)

---

## 2. 環境変数 (Environment Variables) の設定
Next.jsやSupabaseを使用する場合、デプロイ前に必ず登録が必要です。

### 登録コマンド:
$ vercel env add [変数名]

### 主な変数の設定例:
1. NEXT_PUBLIC_SUPABASE_URL
   - Value: (SupabaseのURL)
   - Environments: Production, Preview, Development すべて選択
2. NEXT_PUBLIC_SUPABASE_ANON_KEY
   - Value: (Anon Key)
   - Mark as sensitive?: N
3. SUPABASE_SERVICE_ROLE_KEY
   - Value: (Service Role Key)
   - Mark as sensitive?: y (重要：管理権限キーのため)

---

## 3. アカウントの切り替え・紐付け直し
別のアカウントで同じプロジェクトを公開したい場合の手順です。

### 既存の紐付けを解除する (最も確実な方法)
$ rm -rf .vercel
(Windowsの古いコマンドプロンプトの場合は `rd /s /q .vercel`)
この後、再び `vercel` コマンドを打つと新しいアカウントへの紐付けが始まります。

### ログイン/ログアウト
- 現在のアカウント確認: $ vercel whoami
- ログアウト: $ vercel logout
- 再ログイン: $ vercel login

---

## 4. 本番デプロイの手順
環境設定後、以下のステップで公開します。

### ステップ1: ローカルビルド確認
$ npm run build
(エラーが出る場合は、Suspense Boundaryの欠如などを修正)

### ステップ2: 本番デプロイ
$ vercel --prod

---

## 5. 操作中のトラブル・中断
- 途中でやめたい時: [Ctrl] + [C] を 1〜2回押す (Escは効きません)
- 画面をきれいにしたい時: $ cls

---

## 6. 負荷テスト (k6) との連携
本番URL (https://[project-name].vercel.app) に対して実行します。

- 実行コマンド: $ k6 run load-test.js
- 注意点:
  Vercel無料枠(Hobbyプラン)は帯域幅100GB/月です。
  k6で大量のリクエストを送ると消費が早まるため、
  ダッシュボードの「Settings > Usage」をこまめに確認してください。

---

## 7. UIのクリーンアップ (Cursor/Geminiへの指示)
自動遷移ロジック（単語帳形式）導入後、不要になったボタン（「次の問題」等）を
削除する際は、以下の要点をAIに伝えるとスムーズです。

- 背景: 自動遷移が成功したため、手動ボタンが不要になった。
- 指示: ボタンの削除、関連するState/関数の削除、レイアウトの微調整。
- 参照: .cursorrules のプロジェクト規約に従うこと。