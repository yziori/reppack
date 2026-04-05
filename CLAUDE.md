# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

**reppack** — 語学学習向けに、繰り返し練習用の音声パッケージを自動生成するデスクトップツール。MITライセンス。

## 技術スタック

- **フレームワーク**: Tauri v2 (Rust バックエンド)
- **フロントエンド**: React + TypeScript + Vite
- **スタイリング**: Tailwind CSS v4
- **状態管理**: Zustand
- **音声処理**: Python サイドカー (faster-whisper + pydub)
- **対象OS**: macOS, Windows, Linux

## プロジェクト構成

```
src/                    # React フロントエンド
  components/           # UIコンポーネント
  hooks/                # カスタムフック (useAudioPlayer, useSidecar)
  stores/               # Zustand ストア
  lib/                  # 型定義, Tauriコマンドラッパー
src-tauri/              # Rust バックエンド
  src/commands/         # Tauriコマンド (import, sidecar, export)
  src/sidecar/          # サイドカーマネージャー + プロトコル
python-sidecar/         # Python サイドカー
  reppack_sidecar/      # 音声処理 (transcriber, audio_processor)
```

## 開発コマンド

```bash
pnpm install            # 依存関係インストール
pnpm tauri dev          # 開発サーバー起動 (Rust要)
npx tsc --noEmit        # TypeScript型チェック
```

## サイドカー通信

Rust ↔ Python間はJSON over stdin/stdout（改行区切り）で通信。
Python側はstdoutにプロトコルJSON以外を出力してはならない（ログはstderr）。

## 注意事項

- Rustツールチェインが必要 (`rustup` でインストール)
- Python サイドカーは `faster-whisper` の `large-v3-turbo` モデルを使用（初回起動時にダウンロード、約1.5GB）
- pydub は ffmpeg に依存
