# コードスタイル・規約

## TypeScript / React

- **strict モード**: tsconfig で `strict: true`, `noUnusedLocals`, `noUnusedParameters` 有効
- **命名規則**: コンポーネントは PascalCase、関数・変数は camelCase
- **状態管理**: Zustand のセレクタパターン `useAppStore((s) => s.xxx)`
- **コンポーネント**: 関数コンポーネント + named export
- **インポート**: type-only import (`import type { ... }`) を使用
- **フック**: カスタムフックは `use` プレフィックス、`hooks/` ディレクトリに配置
- **スタイリング**: Tailwind CSS v4 のユーティリティクラス直書き
- **ESModule**: `"type": "module"` で ESM

## Rust

- **edition**: 2021
- **Tauri**: v2 API
- **構造**: commands/ と sidecar/ でモジュール分割
- **エラーハンドリング**: Tauri のコマンドエラー型を使用
- **Serde**: derive マクロで JSON シリアライズ

## Python

- **Python 3.10+**
- **パッケージ構成**: `reppack_sidecar/` パッケージ、`__main__.py` エントリーポイント
- **通信**: stdout に JSON のみ出力、ログは stderr
