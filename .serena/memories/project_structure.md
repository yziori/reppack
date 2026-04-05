# プロジェクト構成

```
src/                        # React フロントエンド
  App.tsx                   # メインコンポーネント
  main.tsx                  # エントリーポイント
  index.css                 # グローバルCSS (Tailwind)
  components/
    FileImport.tsx          # 音声ファイルインポートUI
    SegmentList.tsx          # セグメント一覧表示
    Player.tsx              # 再生コントロール
    PauseControl.tsx        # ポーズ間隔設定
    ExportButton.tsx        # エクスポートボタン
    ProgressOverlay.tsx     # 処理中オーバーレイ
  hooks/
    useAudioPlayer.ts       # 音声再生カスタムフック
    useSidecar.ts           # サイドカー管理フック
  stores/
    appStore.ts             # Zustand ストア（アプリ全体の状態）
  lib/
    types.ts                # 型定義 (Segment, SidecarStatus)
    tauriCommands.ts        # Tauriコマンドラッパー

src-tauri/                  # Rust バックエンド
  src/
    main.rs                 # Tauriエントリーポイント
    lib.rs                  # プラグイン登録・コマンドハンドラ
    commands/
      mod.rs
      import.rs             # import_audio コマンド
      sidecar.rs            # start/stop/request_transcription
      export.rs             # request_export コマンド
    sidecar/
      mod.rs
      manager.rs            # SidecarManager (プロセス管理)
      protocol.rs           # JSON通信プロトコル

python-sidecar/             # Python サイドカー
  reppack_sidecar/
    __main__.py             # エントリーポイント
    __init__.py
    protocol.py             # JSON通信プロトコル
    transcriber.py          # faster-whisper による文字起こし
    audio_processor.py      # pydub による音声処理
    model_manager.py        # Whisperモデル管理
  pyproject.toml
  build/                    # PyInstaller ビルド関連
```
