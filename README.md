# reppack

語学学習向けに、繰り返し練習用の音声パッケージを自動生成するデスクトップツール。

音声ファイルをインポートすると AI が自動で文単位に分割・文字起こしし、セグメント間に任意の長さのポーズを挿入した練習用 MP3 を書き出せます。

## 主な機能

- **音声インポート** — MP3 ファイルをドラッグ＆ドロップまたはダイアログから読み込み
- **AI 文字起こし** — Faster Whisper (`large-v3-turbo`) によるセグメント分割＋テキスト生成
- **再生プレビュー** — セグメント間にポーズを挟みながらの連続再生、セグメントクリックでシーク
- **ポーズ調整** — スライダーで 500 ms〜10,000 ms の範囲でポーズ長を設定
- **MP3 エクスポート** — ポーズ挿入済みの練習用音声を MP3 として書き出し

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フレームワーク | Tauri v2 (Rust) |
| フロントエンド | React 19 + TypeScript + Vite |
| スタイリング | Tailwind CSS v4 |
| 状態管理 | Zustand |
| 音声処理 | Python サイドカー (faster-whisper + pydub) |

## 前提条件

- **Node.js** (v18+) & **pnpm**
- **Rust** ツールチェイン ([rustup](https://rustup.rs/))
- **Python** 3.10+
- **ffmpeg** (pydub が依存)

## セットアップ

```bash
# フロントエンド依存関係
pnpm install

# Python サイドカー依存関係
cd python-sidecar
pip install -e .
cd ..
```

> **Note:** Faster Whisper の `large-v3-turbo` モデル (約 1.5 GB) は初回起動時に自動ダウンロードされます。

## 開発

```bash
pnpm tauri dev          # 開発サーバー起動
npx tsc --noEmit        # TypeScript 型チェック
```

## ビルド

```bash
pnpm tauri build        # プロダクションビルド
```

## プロジェクト構成

```
src/                    # React フロントエンド
  components/           # UI コンポーネント
  hooks/                # カスタムフック
  stores/               # Zustand ストア
  lib/                  # 型定義, Tauri コマンドラッパー
src-tauri/              # Rust バックエンド
  src/commands/         # Tauri コマンド (import, sidecar, export)
  src/sidecar/          # サイドカーマネージャー + プロトコル
python-sidecar/         # Python サイドカー
  reppack_sidecar/      # 音声処理 (transcriber, audio_processor)
```

## ライセンス

[MIT](LICENSE)
