# ToDo: users テーブル変更マイグレーション

「バックエンド仕様書.md」の定義に基づき、`users` テーブルから古い `line_user_id` を廃止し、新しいID/Password認証用のカラム (`login_id`, `password_hash`) を追加するタスクの進行状況です。

## タスク一覧

- [x] マイグレーションSQLの作成 (`supabase/migrations/20260305194836_update_users_table.sql`)
- [x] 開発者によるSQLファイルと本ToDoリストの確認（← **現在ここ**）
- [ ] マイグレーションの適用 (`supabase migration up` または 開発DB等でのSQL直接実行)
- [ ] 関連するアプリケーションコード (例: 未使用ゲストの削除やクリーンアップ) の対応状況確認

## 確認事項
既存の `users` レコードがある場合、`NOT NULL` 制約を満たすために適当なダミー `login_id` と `password_hash` を設定するUPDATE文を書いていますが、テスト環境としてこれで問題ないかご確認ください。よろしければ、マイグレーションの実行へ移ります。
