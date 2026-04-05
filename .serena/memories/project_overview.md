# reppack - プロジェクト概要

**reppack** は語学学習向けに、繰り返し練習用の音声パッケージを自動生成するデスクトップツール（MIT ライセンス）。

## 技術スタック

- **フレームワーク**: Tauri v2 (Rust バックエンド)
- **フロントエンド**: React 19 + TypeScript 5.8 + Vite 7
- **スタイリング**: Tailwind CSS v4 (`@tailwindcss/vite` プラグイン)
- **状態管理**: Zustand v5
- **アイコン**: lucide-react
- **音声処理**: Python サイドカー (faster-whisper + pydub)
- **対象OS**: macOS, Windows, Linux
- **パッケージマネージャ**: pnpm

## 主要な機能フロー

1. 音声ファイルをインポート
2. Python サイドカー（faster-whisper large-v3-turbo）で文字起こし・セグメント分割
3. セグメントごとにプレビュー再生（ポーズ間隔調整可能）
4. 繰り返し練習用の音声パッケージとしてエクスポート

## サイドカー通信

Rust ↔ Python 間は JSON over stdin/stdout（改行区切り）で通信。
Python 側は stdout にプロトコル JSON 以外を出力してはならない（ログは stderr）。
