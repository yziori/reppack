# 開発コマンド

## フロントエンド

```bash
pnpm install              # 依存関係インストール
pnpm tauri dev            # 開発サーバー起動（Rust + Vite HMR）
pnpm build                # TypeScript コンパイル + Vite ビルド
npx tsc --noEmit          # TypeScript 型チェック（CI/タスク完了時）
```

## Rust バックエンド

```bash
cd src-tauri && cargo build    # Rustビルド
cd src-tauri && cargo check    # Rust型チェック
cd src-tauri && cargo clippy   # Rustリント
cd src-tauri && cargo fmt      # Rustフォーマット
```

## Python サイドカー

```bash
cd python-sidecar && pip install -e .          # 開発インストール
cd python-sidecar && python -m reppack_sidecar # サイドカー単体起動
```

## ユーティリティ (macOS / Darwin)

```bash
git status / git log / git diff   # Git操作
ls / find / grep                  # ファイル操作（Darwin標準）
```

## 依存関係

- Rust ツールチェイン (`rustup` でインストール)
- Node.js + pnpm
- Python 3.10+
- ffmpeg（pydub が依存）
- faster-whisper の large-v3-turbo モデル（初回起動時に約1.5GBダウンロード）
