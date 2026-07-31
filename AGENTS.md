# AGENTS.md - AI Agent Operating Guidelines

本ドキュメントは、本プロジェクト (`NgtFes26` / `ngtFesDev`) に参加する AI エージェント（GitHub Copilot, Cursor, Antigravity, LLM アシスタント等）のための汎用開発ガイドラインです。

---

## 🔗 ルール・仕様書の参照マップ (Rule Reference Map)

重複管理を防ぐため、プロジェクトの基本ルールおよび Antigravity 用ルールは以下のドキュメントを正（一次情報源）として運用します。

| ドキュメント | 役割 / 対象 |
| :--- | :--- |
| **[docs/LLM向け/.ai-rules.md](file:///Users/kamitanikazushi/Documents/development/Web開発/Github用/ngtFesDev/docs/LLM向け/.ai-rules.md)** | **プロジェクト基本ルールの一次情報源 (Single Source of Truth)**<br>技術スタック、ワークフロー、共通コード規約の全般。 |
| **[.agents/rules/antigravityrules.md](file:///Users/kamitanikazushi/Documents/development/Web開発/Github用/ngtFesDev/.agents/rules/antigravityrules.md)** | **Antigravity 専用統合ルール** (`always_on` プロンプト)<br>Antigravity が自動ロードして動作する最新ルール定義。 |
| **[docs/architecture.md](file:///Users/kamitanikazushi/Documents/development/Web開発/Github用/ngtFesDev/docs/architecture.md)** | **システムアーキテクチャ仕様書**<br>全体構成、データフロー、認証・認可モデルの詳細。 |
| **[docs/database.md](file:///Users/kamitanikazushi/Documents/development/Web開発/Github用/ngtFesDev/docs/database.md)** | **データベース設計仕様書**<br>物理テーブル、RPC (Database Functions)、RLS ポリシーの詳細。 |

---

## 1. エージェント開発基本原則 (Core Principles)

1. **仕様順守**: [docs/LLM向け/.ai-rules.md](file:///Users/kamitanikazushi/Documents/development/Web開発/Github用/ngtFesDev/docs/LLM向け/.ai-rules.md) および各仕様書の定義を厳格に遵守してください。
2. **最小限の破壊防止**: 指示されたタスクに集中し、無関係なコードの変更やファイル削除を禁止します。
3. **推測の排除**: 不確定な挙動や仕様は独自判断で決めつけず、「TODO」または「要確認」として記録・報告してください。
4. **検証の徹底**: 変更後は必ず以下コマンドを実行してください：
   - `npm run type-check` (型チェック)
   - `npm run lint` (スタイル確認)
   - `npm run test` (単体テスト)

---

## 2. コーディング要点ガイドライン

- **Shadcn UI コンポーネントの再利用**:
  - UI作成時は `src/components/ui/` に存在するコンポーネントを優先的に利用し、類似コンポーネントの重複作成を避けてください。
- **データ操作の安全化 (RPC 優先)**:
  - 混雑状況、整理券、クイズスコア等の重要操作は、直接のテーブル `INSERT` / `UPDATE` ではなく Supabase の **RPC (Database Functions)** を呼出してください。
- **型安全性の確保**:
  - `any` 型を避け、厳格な TypeScript 型定義を利用してください。

---

## 3. 開発フロー & 失敗時ルール

```mermaid
flowchart TD
    A[タスク受領] --> B[仕様書・ソースコード調査]
    B --> C[最小限のコード実装]
    C --> D[型チェック & テスト実行]
    D -->|成功| E[変更検証 & ユーザー報告]
    D -->|失敗 (3回連続)| F[作業停止 & ログ報告・指示待ち]
```

- 同一エラーの修正に **3回連続で失敗** した場合は、修正を中断してエラーログと現状の調査結果をユーザーに報告し、次の指示を求めてください。
