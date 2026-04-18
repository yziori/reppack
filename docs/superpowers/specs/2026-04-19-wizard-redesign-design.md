# Wizard Redesign — 設計仕様

## 背景

現状の `reppack` フロントエンドは、単一ページ上に `FileImport` / 文字起こしボタン / `Player` / `SegmentList` / `ExportButton` を並べただけの素朴な構成で、UX の流れが整理されていない。一方、デザインカンプ（`reppack.zip`）には 5 ステップのウィザード形式・エディトリアル雑誌風のビジュアルが用意されている。

本仕様は、カンプを参考に **Tailwind CSS v4 で描き直した 5 ステップウィザード UI** を実装し、既存の Tauri バックエンド（Python サイドカー経由の faster-whisper + pydub）と統合することを目的とする。ビジュアルは忠実なポートではなく、Tailwind ユーティリティ + CSS カスタムプロパティ（`@theme`）で再構築する。

## ゴール

- 5 ステップ（Import → Transcribe → Review → Configure → Export）のウィザード UI
- 栞色（赤オレンジ系）+ 翡翠（jade green）の 2 色ベース
- IBM Plex Sans JP / IBM Plex Mono のエディトリアル風タイポグラフィ
- 各ステップが実際の Tauri コマンドと連動して動作する
- macOS / Windows / Linux で同じ見た目

## 非ゴール（MVP 範囲外）

- ダークテーマ切替 UI（トークンは `@theme` 予約のみ）
- 英語 UI 切替（i18n モジュールは用意するが日本語のみ）
- Tweaks パネル（言語/テーマ/密度/サブカラー切替）
- 「最近のプロジェクト」一覧（デザインにはあるが MVP では削除）
- Step 3 の分割ルール編集パネル（RulesPanel）
- Export の字幕同梱 / チャプター埋め込み等の付録オプション
- 独自アイコンセット（`lucide-react` で代替）

## 技術方針

### スタック

- 既存: React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, TanStack Router
- 追加: なし（既存ライブラリで完結）
- 削除予定: なし（破棄するのは旧 UI コンポーネントのみ）

### ビジュアル: `@theme` で設計トークン化

Tailwind v4 の `@theme` ブロックで以下を定義し、`bg-paper-1`・`text-ink-900`・`bg-shiori-500`・`text-hisui-500` 等のユーティリティを発行させる。

```css
/* src/index.css */
@import "tailwindcss";

@theme {
  /* Paper（背景層） */
  --color-paper-0: oklch(0.985 0.006 80);
  --color-paper-1: oklch(0.965 0.012 82);
  --color-paper-2: oklch(0.945 0.018 82);
  --color-paper-3: oklch(0.915 0.022 82);
  --color-paper-edge: oklch(0.85 0.025 80);

  /* Ink（文字・アイコン） */
  --color-ink-900: oklch(0.22 0.015 60);
  --color-ink-700: oklch(0.38 0.015 60);
  --color-ink-500: oklch(0.55 0.015 60);
  --color-ink-300: oklch(0.72 0.015 60);

  /* 栞色（プライマリアクセント） */
  --color-shiori-600: oklch(0.52 0.16 32);
  --color-shiori-500: oklch(0.60 0.17 34);
  --color-shiori-400: oklch(0.72 0.14 36);
  --color-shiori-100: oklch(0.93 0.04 38);

  /* 翡翠（完了・セカンダリ） */
  --color-hisui-600: oklch(0.42 0.12 165);
  --color-hisui-500: oklch(0.52 0.12 165);
  --color-hisui-100: oklch(0.92 0.05 165);

  /* マーカー黄 */
  --color-marker: oklch(0.92 0.13 95);
  --color-marker-line: oklch(0.82 0.16 92);

  /* 機能色 */
  --color-ok: oklch(0.55 0.11 150);
  --color-warn: oklch(0.62 0.15 70);
  --color-err: oklch(0.52 0.18 25);

  /* Font */
  --font-serif: "IBM Plex Sans JP", "IBM Plex Sans", system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, Menlo, monospace;

  /* 角丸 */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 22px;

  /* 暖色・柔らかいシャドウ */
  --shadow-warm-sm: 0 1px 0 oklch(1 0 0 / 0.6) inset, 0 1px 2px oklch(0.2 0.02 60 / 0.06);
  --shadow-warm-md: 0 1px 0 oklch(1 0 0 / 0.6) inset, 0 2px 4px oklch(0.2 0.02 60 / 0.05), 0 8px 20px oklch(0.2 0.02 60 / 0.06);
  --shadow-warm-lg: 0 1px 0 oklch(1 0 0 / 0.7) inset, 0 4px 10px oklch(0.2 0.02 60 / 0.06), 0 24px 48px oklch(0.2 0.02 60 / 0.12);
}
```

`index.html` に IBM Plex Sans JP / Mono の `<link>` タグを追加する。

### ディレクトリ構成（再帰的 features 型）

参考: <https://zenn.dev/pksha/articles/recursive-features-directory-structure>

判断基準: Tauri/サイドカー呼び出し等の「API 呼び」を持つ → `features/`、props 専用 → `components/`。他 feature からは `index.tsx` のみ参照可能。

```
src/
├── main.tsx
├── index.css                        # @theme トークン定義
├── routes/
│   ├── __root.tsx
│   └── index.tsx                    # Wizard shell: レイアウト + step 切替
├── features/
│   ├── StepImport/                  # importAudio / probeAudio
│   │   ├── index.tsx
│   │   └── components/
│   │       ├── DropZone.tsx
│   │       └── LoadedFile.tsx
│   ├── StepTranscribe/              # requestTranscription + sidecar
│   │   ├── index.tsx
│   │   └── components/
│   │       ├── PhaseProgress.tsx
│   │       └── TranscriptStream.tsx
│   ├── StepReview/                  # segments 編集（merge/split/delete）
│   │   ├── index.tsx
│   │   └── components/
│   │       ├── ParagraphView.tsx
│   │       ├── SegmentList.tsx
│   │       └── TimelineBar.tsx
│   ├── StepConfigure/               # cfg 操作
│   │   ├── index.tsx
│   │   └── components/
│   │       ├── ModeSelect.tsx
│   │       ├── PauseControl.tsx
│   │       └── SummaryCard.tsx
│   └── StepExport/                  # requestExport
│       ├── index.tsx
│       └── components/
│           ├── PreviewPlayer.tsx
│           └── ExportOptions.tsx
├── components/
│   ├── wizard/                      # Wizard chrome（routes から使う）
│   │   ├── MacWindow.tsx
│   │   ├── Sidebar.tsx
│   │   ├── CanvasShell.tsx
│   │   └── NavFoot.tsx
│   ├── Button.tsx                   # 共通プリミティブ
│   ├── Segmented.tsx
│   ├── Slider.tsx
│   ├── Chip.tsx
│   └── Kbd.tsx
├── hooks/
│   ├── useAudioPlayer.ts
│   └── useSidecar.ts
├── lib/
│   ├── i18n.ts                      # 日本語のみ（構造は英語拡張可能）
│   ├── tauriCommands.ts
│   └── types.ts
└── stores/
    └── appStore.ts
```

### 削除する既存コンポーネント

以下は各ステップに機能吸収されるため削除:

- `src/components/FileImport.tsx`
- `src/components/SegmentList.tsx`
- `src/components/Player.tsx`
- `src/components/PauseControl.tsx`
- `src/components/ExportButton.tsx`
- `src/components/ProgressOverlay.tsx`

## Zustand ストア構造

```typescript
// src/stores/appStore.ts
export type WizardStep = 0 | 1 | 2 | 3 | 4;
export type PracticeMode = "repeat" | "overlap";
export type PauseKind = "preset" | "ratio";

export interface Cfg {
  mode: PracticeMode;
  pauseKind: PauseKind;
  pausePreset: number;    // 1.0 / 1.5 / 2.0 / 3.0 秒
  pauseRatio: number;     // ×0.5〜3.0 of segment length
  speed: number;          // 0.75 / 1.0 / 1.25 / 1.5
  repeats: number;        // 1〜10
}

export interface FileMeta {
  sizeBytes: number;
  durationSec: number;
  sampleRateHz: number;
  channels: number;
}

export interface ExportOptions {
  format: "mp3" | "m4a" | "wav";
  bitrateKbps: number;    // 128 / 192 / 256 / 320
  outputDir: string | null;
}

interface AppState {
  // Wizard
  step: WizardStep;

  // Step 1: Import
  sourceFilePath: string | null;
  sourceFileName: string | null;
  fileMeta: FileMeta | null;
  sourceLang: string;     // "auto" | "en" | "ja" | ...

  // Step 2: Transcribe
  sidecarStatus: SidecarStatus;
  processingProgress: number;
  processingMessage: string;
  transcribePhase: 0 | 1;
  latestTranscript: string;

  // Step 3: Review
  segments: Segment[];
  selectedSegmentId: number | null;

  // Step 4: Configure
  cfg: Cfg;

  // Step 5: Export
  exportOptions: ExportOptions;
  isExporting: boolean;
  exportProgress: number;
  exportedFilePath: string | null;

  // Actions
  setStep: (step: WizardStep) => void;
  setSourceFile: (path: string, name: string, meta: FileMeta) => void;
  clearSourceFile: () => void;
  setSourceLang: (lang: string) => void;
  setSidecarStatus: (status: SidecarStatus) => void;
  setProcessingProgress: (progress: number, message: string, phase?: 0 | 1) => void;
  setLatestTranscript: (text: string) => void;
  setSegments: (segments: Segment[]) => void;
  updateSegment: (id: number, patch: Partial<Segment>) => void;
  mergeSegments: (id: number) => void;      // id と id-1 を結合
  splitSegment: (id: number, charIdx: number) => void;
  deleteSegment: (id: number) => void;
  selectSegment: (id: number | null) => void;
  setCfg: (patch: Partial<Cfg>) => void;
  setExportOptions: (patch: Partial<ExportOptions>) => void;
  setExporting: (exporting: boolean, progress?: number) => void;
  setExportedFilePath: (path: string | null) => void;
  reset: () => void;
}
```

## Tauri 統合マッピング

### Step 1: Import

- ファイル選択: `@tauri-apps/plugin-dialog` の `open`（ドロップは HTML5 で受ける）
- **既存 Tauri コマンド `import_audio` を拡張**して `FileMeta` も返すようにする（`AudioFileInfo` を `{path, name, meta: FileMeta}` に変更）
  - Rust 側で `symphonia` crate を使って duration/sampleRate/channels/size を取得
  - 別コマンドに分ける必要はない（import = ファイル受理 + メタ解析 をまとめて扱う）
- 完了 → `setSourceFile(path, name, meta)` → 次へ活性化

### Step 2: Transcribe

- 入ったら `useSidecar.start()` →（ready ならスキップ）→ `requestTranscription(path, lang)`
- `useSidecar` のイベントリスナで `transcribePhase` と `latestTranscript` を更新
  - **Python サイドカー側で progress payload に `phase: 0|1` を追加**
  - Phase 0 = 無音検出 (pydub), Phase 1 = 文字起こし (faster-whisper)
- 完了（segments 受信） → `setSegments` → 次へ活性化

### Step 3: Review

- Tauri 呼ばない。ストア内の `mergeSegments/splitSegment/deleteSegment/updateSegment` のみ
- 再生は既存 `useAudioPlayer.seekToSegment()` を利用
- 原稿ビュー/セグメント一覧の切替はローカル state

### Step 4: Configure

- Tauri 呼ばない。`setCfg` のみ
- `SummaryCard` は `segments` + `cfg` から推定時間・サイズを純関数で算出

### Step 5: Export

- プレビュー: `useAudioPlayer.playWithGaps` で `cfg` 反映試聴（既存流用）
- 出力先選択: `@tauri-apps/plugin-dialog` の `save`
- **`requestExport` 引数拡張**: `{format, bitrateKbps, cfg, segments, outputPath}`
- Python 側で `pydub` の `export(format=..., bitrate="192k")` で書き出し、cfg に従いポーズ挿入・繰り返し展開
- 進捗 → `setExporting(true, percent)` / 完了 → `setExportedFilePath(path)`

### 既存コードの扱い

| ファイル | 扱い |
|---|---|
| `src/hooks/useAudioPlayer.ts` | そのまま利用 |
| `src/hooks/useSidecar.ts` | progress payload の `phase` 対応を追加 |
| `src/lib/tauriCommands.ts` | `importAudio` の戻り値に `meta` 追加、`requestExport` 引数拡張 |
| `src-tauri/src/commands/import.rs` | `FileMeta` 取得を追加（symphonia 依存） |
| `src-tauri/src/commands/export.rs` | 引数拡張 |
| `python-sidecar/reppack_sidecar/transcriber.py` | progress に `phase` 追加 |
| `python-sidecar/reppack_sidecar/audio_processor.py` | cfg ベースで繰り返し・ポーズ展開 |

## ステップ遷移制約

- サイドバーのステップクリックは「完了済みステップ」または現ステップのみ遷移可
- 「次へ」活性条件:
  - Step 0 (Import): `sourceFilePath && fileMeta` が真
  - Step 1 (Transcribe): `segments.length > 0 && sidecarStatus === "ready"`
  - Step 2 (Review): 常に活性（編集は任意）
  - Step 3 (Configure): 常に活性
  - Step 4 (Export): 書き出し完了時のみ「フォルダを開く / 新しいパッケージ」ボタンを出す

## エラー処理

| 箇所 | 挙動 |
|---|---|
| Step 0 非対応形式 | `import_audio` がメタ解析失敗 → ドロップゾーンをエラー枠表示、「MP3/M4A/WAV/FLAC/OGG に変換してください」 |
| Step 0 破損ファイル | 同上、「ヘッダー破損・再エクスポート推奨」 |
| Step 1 サイドカー起動失敗 | エラーバナー + 「再試行」ボタン |
| Step 1 文字起こし途中エラー | エラー表示 + 戻って別ファイル選択可 |
| Step 4 出力失敗 | エラーバナー + 「再試行」ボタン（前ステップに戻らなくて可） |
| Step 4 空き容量不足等 | Tauri エラーをそのまま表示 |

## キーボードショートカット（MVP）

- グローバル: `Enter` で次へ（活性時）/ `Esc` で戻る
- Step 2 (Review) 選択中セグメント対象: `S` 分割 / `M` 結合 / `⌫` 削除

## テスト方針

- ユニット: `appStore` の segments 操作（merge/split/delete）を vitest で検証
- 統合: Tauri 経由の probe/transcribe/export は手動確認（E2E は MVP 範囲外）
- 型: `npx tsc --noEmit` をコミット前に必ずパスさせる

## 検証方法（実装完了時）

1. `pnpm tauri dev` で起動
2. MP3 ファイルをドロップ → Step 1 でメタ情報表示、次へ遷移
3. Step 2 で faster-whisper 起動 → 2 相の進捗表示 → 完了で segments 取得
4. Step 3 で segment のマージ/分割/削除、再生確認
5. Step 4 でモード・ポーズ・速度・繰り返しを設定 → Summary が即時更新
6. Step 5 でプレビュー再生 → 保存先選択 → エクスポート実行 → 完了後「フォルダを開く」動作
7. `npx tsc --noEmit` がパス
8. 不正ファイル投入でエラー UI が出る
