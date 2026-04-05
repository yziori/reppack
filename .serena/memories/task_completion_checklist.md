# タスク完了時のチェックリスト

タスクが完了したら以下を確認：

1. **TypeScript 型チェック**: `npx tsc --noEmit` でエラーがないこと
2. **Rust チェック**: `cd src-tauri && cargo check` でエラーがないこと
3. **リント**: `cd src-tauri && cargo clippy` で警告がないこと
4. **動作確認**: `pnpm tauri dev` で正常に起動できること（必要に応じて）

注意: 現在テストフレームワークは未設定（フロントエンド・Rust共に）。
