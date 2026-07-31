---
trigger: always_on
---

# Project Rules & Operating Guidelines for Antigravity

本ファイルは、Google Antigravity エージェントが本プロジェクト (`NgtFes26` / `ngtFesDev`) で作業する際に遵守すべき**唯一の統合ルール定義**です。
基本原則や技術仕様の一次情報源として [docs/LLM向け/.ai-rules.md](file:///Users/kamitanikazushi/Documents/development/Web開発/Github用/ngtFesDev/docs/LLM向け/.ai-rules.md) および [AGENTS.md](file:///Users/kamitanikazushi/Documents/development/Web開発/Github用/ngtFesDev/AGENTS.md) を参照します。

---

## 1. プロジェクト基本原則 (Core Principles)

1. **仕様の遵守**: `docs/` ディレクトリ配下の仕様書 (`仕様書.md`, `フロントエンド仕様書.md`, `バックエンド仕様書.md`) および `docs/LLM向け/.ai-rules.md` を厳格に順守すること。
2. **安全第一 & 最小限の変更**: 指示されたタスクに集中し、関連のないコードの書き換え・リファクタリング・未指示のファイル削除を厳禁とする。
3. **推測の排除**: 要件の曖昧な点や未確定要素は独自判断で断定せず、「TODO」または「要確認」と明記・報告すること。
4. **検証の義務化**: コード変更後は必ず型チェック (`npm run type-check`)、スタイル確認 (`npm run lint`)、テスト (`npm run test`) を実行して正常稼働を確認すること。

---

## 2. 技術スタック & アーキテクチャ

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS 4, Shadcn UI (`src/components/ui`), Lucide React (`lucide-react`)
- **Backend / Database**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **State Management**: TanStack Query (React Query) v5, Context API
- **Testing**: Vitest (`vitest`)

### ディレクトリ構造と役割
- `app/`: Next.js App Router ページおよび API Routes
- `src/components/ui/`: Shadcn UI コンポーネント (**最優先で既存コンポーネントを再利用すること**)
- `src/components/`: ドメイン別 UI (`admin/`, `operator/`, `project/`, `auth/`, `common/`, `layout/`)
- `src/contexts/`: React Context (`SessionContext.tsx`, `OperatorContext.tsx`)
- `src/hooks/`: カスタム Hook (`useFastpassSalesStatus.ts`, `useSystemSettings.ts`)
- `src/lib/`: ロジック・ヘルパー関数 (`supabase.ts`, `projectFetcher.ts`, `fastpass.ts`)
- `supabase/`: マイグレーション・SQL定義 (`migrations/`, `full_setup.sql`)

---

## 3. コーディング規約 (Coding Standards)

1. **Shadcn UI の優先利用**: ボタン、ダイアログ、ラベル等の UI 作成時は、まず `src/components/ui` 内のコンポーネントを使用し、独自のインラインスタイル作成を避ける。
2. **DRY 原則**: ロジックの重複を避け、共通の API 呼び出しや計算処理は `src/lib/` またはカスタム Hook (`src/hooks/`) に切り出す。
3. **型安全性**: `any` 型の使用は禁止。型定義は `src/types/` または Supabase 自動生成型を利用する。
4. **エラーハンドリング**: ユーザーへの通知には `sonner` (`toast()`) を使用する。

---

## 4. Supabase & データベース統合ルール

1. **データベース直接操作の制限**:
   - 混雑状況の更新、整理券の発行・消し込み・キャンセル、クイズスコアの登録等、データ整合性が重要な処理はテーブル直接の `INSERT` / `UPDATE` ではなく、対応する **RPC (Database Functions)** を呼び出す。
2. **認証の区別**:
   - **来場者**: ゲストID/パスワードによる Supabase Auth 認証。
   - **運営者**: 専用 RPC (`operator_login`) によるセッション認証。
   - **管理者**: `users.role = 'admin'` によるロール認証。

---

## 5. エージェント開発フロー & 検証ルール

1. **調査フェーズ**: 該当コードや関連する `docs/` を確認する。
2. **実装フェーズ**: 単一タスクに集中し、アトミックに変更を適用する。
3. **検証フェーズ**: 以下のコマンドを順番に実行する：
   ```bash
   npm run type-check
   npm run lint
   npm run test
   ```
4. **失敗時の停止ルール**: 同一のエラー修正に **3回連続で失敗** した場合は作業を停止し、エラーログと調査結果をまとめてユーザーに報告し、次の指示を仰ぐこと。

---

## 6. 特記事項・TODO

- [ ] **LINEログイン機能**: 本バージョンでは**廃止済み**（ID/PASS認証に一本化）。
- [ ] **投票機能 (Voting)**: マイグレーションにより**削除済み**。
- [ ] **テスト拡充**: 主要 RPC やカスタム Hook に対する Vitest テストの拡充【TODO】。
