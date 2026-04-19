# Wizard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `reppack` のフロントエンドを 5 ステップウィザードに置き換え、各ステップが実際の Tauri バックエンドと連動する MVP を完成させる。

**Architecture:** Tailwind v4 の `@theme` で設計トークンを定義し、再帰的 features 型ディレクトリ構成でコンポーネントを配置する。状態は Zustand ストアに集約し、UI 層はプレゼンテーショナルに保つ。Tauri コマンド `import_audio` と `request_export`、Python サイドカーの transcribe/insert_pauses を拡張して新しい要件に対応させる。

**Tech Stack:** React 19, TypeScript 5.8, Tailwind CSS v4, Zustand, TanStack Router, Tauri 2, Rust (symphonia crate), Python 3 (faster-whisper, pydub), vitest（新規導入）。

**Spec:** `docs/superpowers/specs/2026-04-19-wizard-redesign-design.md`

---

## File Structure

### 新規作成ファイル

```
src/
├── lib/i18n.ts                                 # 日本語文字列定義
├── features/
│   ├── StepImport/index.tsx
│   ├── StepImport/components/DropZone.tsx
│   ├── StepImport/components/LoadedFile.tsx
│   ├── StepTranscribe/index.tsx
│   ├── StepTranscribe/components/PhaseProgress.tsx
│   ├── StepTranscribe/components/TranscriptStream.tsx
│   ├── StepReview/index.tsx
│   ├── StepReview/components/ParagraphView.tsx
│   ├── StepReview/components/SegmentList.tsx
│   ├── StepReview/components/TimelineBar.tsx
│   ├── StepConfigure/index.tsx
│   ├── StepConfigure/components/ModeSelect.tsx
│   ├── StepConfigure/components/PauseControl.tsx
│   ├── StepConfigure/components/SummaryCard.tsx
│   ├── StepExport/index.tsx
│   ├── StepExport/components/PreviewPlayer.tsx
│   └── StepExport/components/ExportOptions.tsx
├── components/
│   ├── wizard/MacWindow.tsx
│   ├── wizard/Sidebar.tsx
│   ├── wizard/CanvasShell.tsx
│   ├── wizard/NavFoot.tsx
│   ├── Button.tsx
│   ├── Segmented.tsx
│   ├── Slider.tsx
│   ├── Chip.tsx
│   └── Kbd.tsx
└── stores/appStore.test.ts                     # vitest 用テスト
```

### 修正ファイル

| ファイル | 変更内容 |
|---|---|
| `package.json` | `vitest`, `@testing-library/*` 追加 |
| `vite.config.ts` | vitest 設定追加 |
| `index.html` | IBM Plex フォント link 追加 |
| `src/index.css` | `@theme` トークン定義に置換 |
| `src/main.tsx` | (変更なし、確認のみ) |
| `src/lib/types.ts` | `FileMeta` / `Cfg` / `ExportOptions` / `WizardStep` 追加 |
| `src/lib/tauriCommands.ts` | `importAudio` 戻り値拡張、`requestExport` 引数拡張 |
| `src/stores/appStore.ts` | ウィザード用状態・アクション全面追加 |
| `src/hooks/useSidecar.ts` | `phase` と `latest_text` の処理追加 |
| `src/routes/__root.tsx` | `ProgressOverlay` 削除 |
| `src/routes/index.tsx` | ウィザードシェルに置換 |
| `src-tauri/Cargo.toml` | `symphonia` crate 追加 |
| `src-tauri/src/commands/import.rs` | `FileMeta` 取得追加、MP3 以外の形式も受理 |
| `src-tauri/src/commands/export.rs` | cfg / format / bitrate 引数追加 |
| `python-sidecar/reppack_sidecar/transcriber.py` | progress に `phase` 追加 |
| `python-sidecar/reppack_sidecar/audio_processor.py` | cfg ベース展開（mode/repeats/speed/format/bitrate） |

### 削除ファイル

| ファイル | 理由 |
|---|---|
| `src/components/FileImport.tsx` | StepImport に吸収 |
| `src/components/SegmentList.tsx` | StepReview/components/ に置換 |
| `src/components/Player.tsx` | PreviewPlayer（StepExport）と useAudioPlayer で代替 |
| `src/components/PauseControl.tsx` | StepConfigure/components/PauseControl.tsx に置換 |
| `src/components/ExportButton.tsx` | StepExport に吸収 |
| `src/components/ProgressOverlay.tsx` | 各ステップ内の進捗表示に分散 |

---

## Phase 1: Foundation

### Task 1: vitest を導入する

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`

- [ ] **Step 1: 依存関係を追加**

```bash
pnpm add -D vitest @testing-library/react @testing-library/dom @testing-library/jest-dom jsdom
```

- [ ] **Step 2: package.json の scripts に test を追加**

`package.json` の `"scripts"` に追加:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: vite.config.ts に vitest 設定を追加**

既存の `defineConfig` 内に `test` を追加:

```typescript
test: {
  environment: "jsdom",
  globals: true,
},
```

型解決のため、ファイル冒頭に triple-slash directive を追加:

```typescript
/// <reference types="vitest" />
```

- [ ] **Step 4: 最小テストで動作確認**

`src/sanity.test.ts` を作成:

```typescript
import { describe, it, expect } from "vitest";

describe("sanity", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `pnpm test`
Expected: 1 passed

- [ ] **Step 5: sanity テストを削除、コミット**

```bash
rm src/sanity.test.ts
git add package.json pnpm-lock.yaml vite.config.ts
git commit -m "chore: setup vitest with jsdom environment"
```

---

### Task 2: Tailwind v4 の `@theme` で設計トークン定義 + フォント読み込み

**Files:**
- Modify: `src/index.css`
- Modify: `index.html`

- [ ] **Step 1: `src/index.css` を置換**

```css
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

html, body, #root {
  height: 100%;
  margin: 0;
  background: var(--color-paper-1);
  color: var(--color-ink-900);
  font-family: var(--font-serif);
}
```

- [ ] **Step 2: `index.html` にフォント link を追加**

`<head>` 内に追加:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Sans+JP:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

- [ ] **Step 3: 動作確認**

Run: `pnpm tauri dev`
Expected: アプリ起動、背景がクリーム色、フォントが IBM Plex 系。

- [ ] **Step 4: コミット**

```bash
git add src/index.css index.html
git commit -m "feat: add design tokens via @theme and IBM Plex fonts"
```

---

### Task 3: 型定義を拡張

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: 型を追加**

既存の `types.ts` の末尾に追加:

```typescript
export type WizardStep = 0 | 1 | 2 | 3 | 4;

export type PracticeMode = "repeat" | "overlap";
export type PauseKind = "preset" | "ratio";

export interface Cfg {
  mode: PracticeMode;
  pauseKind: PauseKind;
  pausePreset: number;
  pauseRatio: number;
  speed: number;
  repeats: number;
}

export interface FileMeta {
  sizeBytes: number;
  durationSec: number;
  sampleRateHz: number;
  channels: number;
}

export interface ExportOptions {
  format: "mp3" | "m4a" | "wav";
  bitrateKbps: number;
  outputDir: string | null;
}
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/lib/types.ts
git commit -m "feat: add WizardStep/Cfg/FileMeta/ExportOptions types"
```

---

### Task 4: Zustand ストアを拡張（テスト駆動）

**Files:**
- Create: `src/stores/appStore.test.ts`
- Modify: `src/stores/appStore.ts`

- [ ] **Step 1: テストを書く（失敗する）**

`src/stores/appStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "./appStore";

describe("appStore", () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  describe("segments", () => {
    it("merges a segment with its previous one", () => {
      useAppStore.getState().setSegments([
        { id: 1, start: 0, end: 2, text: "Hello" },
        { id: 2, start: 2, end: 4, text: "world." },
        { id: 3, start: 4, end: 6, text: "Goodbye." },
      ]);
      useAppStore.getState().mergeSegments(2);
      const segs = useAppStore.getState().segments;
      expect(segs).toHaveLength(2);
      expect(segs[0]).toEqual({ id: 1, start: 0, end: 4, text: "Hello world." });
      expect(segs[1].id).toBe(2);
    });

    it("merging the first segment is a no-op", () => {
      useAppStore.getState().setSegments([
        { id: 1, start: 0, end: 2, text: "A" },
        { id: 2, start: 2, end: 4, text: "B" },
      ]);
      useAppStore.getState().mergeSegments(1);
      expect(useAppStore.getState().segments).toHaveLength(2);
    });

    it("splits a segment at the given char index", () => {
      useAppStore.getState().setSegments([
        { id: 1, start: 0, end: 6, text: "Hello world" },
      ]);
      useAppStore.getState().splitSegment(1, 5);
      const segs = useAppStore.getState().segments;
      expect(segs).toHaveLength(2);
      expect(segs[0].text).toBe("Hello");
      expect(segs[1].text).toBe("world");
      expect(segs[0].end).toBeCloseTo(segs[1].start);
    });

    it("deletes a segment and renumbers", () => {
      useAppStore.getState().setSegments([
        { id: 1, start: 0, end: 2, text: "A" },
        { id: 2, start: 2, end: 4, text: "B" },
        { id: 3, start: 4, end: 6, text: "C" },
      ]);
      useAppStore.getState().deleteSegment(2);
      const segs = useAppStore.getState().segments;
      expect(segs.map((s) => s.text)).toEqual(["A", "C"]);
      expect(segs.map((s) => s.id)).toEqual([1, 2]);
    });
  });

  describe("cfg", () => {
    it("updates only provided fields", () => {
      useAppStore.getState().setCfg({ speed: 1.25 });
      expect(useAppStore.getState().cfg.speed).toBe(1.25);
      expect(useAppStore.getState().cfg.mode).toBe("repeat");
    });
  });

  describe("reset", () => {
    it("returns the store to initial state", () => {
      useAppStore.getState().setStep(3);
      useAppStore.getState().setCfg({ speed: 1.5 });
      useAppStore.getState().reset();
      expect(useAppStore.getState().step).toBe(0);
      expect(useAppStore.getState().cfg.speed).toBe(1);
    });
  });
});
```

- [ ] **Step 2: テスト実行で失敗を確認**

Run: `pnpm test`
Expected: FAIL（`mergeSegments`, `splitSegment`, `deleteSegment`, `setCfg`, `reset` が未定義）

- [ ] **Step 3: `src/stores/appStore.ts` を全面書き換え**

```typescript
import { create } from "zustand";
import type {
  Cfg,
  ExportOptions,
  FileMeta,
  Segment,
  SidecarStatus,
  WizardStep,
} from "../lib/types";

interface AppState {
  step: WizardStep;

  sourceFilePath: string | null;
  sourceFileName: string | null;
  fileMeta: FileMeta | null;
  sourceLang: string;

  sidecarStatus: SidecarStatus;
  processingProgress: number;
  processingMessage: string;
  transcribePhase: 0 | 1;
  latestTranscript: string;

  segments: Segment[];
  selectedSegmentId: number | null;

  cfg: Cfg;

  exportOptions: ExportOptions;
  isExporting: boolean;
  exportProgress: number;
  exportedFilePath: string | null;

  setStep: (step: WizardStep) => void;
  setSourceFile: (path: string, name: string, meta: FileMeta) => void;
  clearSourceFile: () => void;
  setSourceLang: (lang: string) => void;
  setSidecarStatus: (status: SidecarStatus) => void;
  setProcessingProgress: (progress: number, message: string, phase?: 0 | 1) => void;
  setLatestTranscript: (text: string) => void;
  setSegments: (segments: Segment[]) => void;
  updateSegment: (id: number, patch: Partial<Segment>) => void;
  mergeSegments: (id: number) => void;
  splitSegment: (id: number, charIdx: number) => void;
  deleteSegment: (id: number) => void;
  selectSegment: (id: number | null) => void;
  setCfg: (patch: Partial<Cfg>) => void;
  setExportOptions: (patch: Partial<ExportOptions>) => void;
  setExporting: (exporting: boolean, progress?: number) => void;
  setExportedFilePath: (path: string | null) => void;
  reset: () => void;
}

const initialCfg: Cfg = {
  mode: "repeat",
  pauseKind: "preset",
  pausePreset: 1.5,
  pauseRatio: 1.2,
  speed: 1,
  repeats: 2,
};

const initialExportOptions: ExportOptions = {
  format: "mp3",
  bitrateKbps: 192,
  outputDir: null,
};

const initialState = {
  step: 0 as WizardStep,
  sourceFilePath: null,
  sourceFileName: null,
  fileMeta: null,
  sourceLang: "auto",
  sidecarStatus: "idle" as SidecarStatus,
  processingProgress: 0,
  processingMessage: "",
  transcribePhase: 0 as 0 | 1,
  latestTranscript: "",
  segments: [] as Segment[],
  selectedSegmentId: null,
  cfg: initialCfg,
  exportOptions: initialExportOptions,
  isExporting: false,
  exportProgress: 0,
  exportedFilePath: null,
};

function renumber(segs: Segment[]): Segment[] {
  return segs.map((s, i) => ({ ...s, id: i + 1 }));
}

export const useAppStore = create<AppState>()((set) => ({
  ...initialState,

  setStep: (step) => set({ step }),

  setSourceFile: (path, name, meta) =>
    set({ sourceFilePath: path, sourceFileName: name, fileMeta: meta }),

  clearSourceFile: () =>
    set({ sourceFilePath: null, sourceFileName: null, fileMeta: null }),

  setSourceLang: (lang) => set({ sourceLang: lang }),

  setSidecarStatus: (status) => set({ sidecarStatus: status }),

  setProcessingProgress: (progress, message, phase) =>
    set((s) => ({
      processingProgress: progress,
      processingMessage: message,
      transcribePhase: phase ?? s.transcribePhase,
    })),

  setLatestTranscript: (text) => set({ latestTranscript: text }),

  setSegments: (segments) => set({ segments: renumber(segments) }),

  updateSegment: (id, patch) =>
    set((s) => ({
      segments: s.segments.map((seg) => (seg.id === id ? { ...seg, ...patch } : seg)),
    })),

  mergeSegments: (id) =>
    set((s) => {
      const idx = s.segments.findIndex((seg) => seg.id === id);
      if (idx <= 0) return s;
      const prev = s.segments[idx - 1];
      const curr = s.segments[idx];
      const merged: Segment = {
        id: prev.id,
        start: prev.start,
        end: curr.end,
        text: `${prev.text} ${curr.text}`.trim(),
      };
      const next = [...s.segments];
      next.splice(idx - 1, 2, merged);
      return { segments: renumber(next) };
    }),

  splitSegment: (id, charIdx) =>
    set((s) => {
      const idx = s.segments.findIndex((seg) => seg.id === id);
      if (idx < 0) return s;
      const seg = s.segments[idx];
      if (charIdx <= 0 || charIdx >= seg.text.length) return s;
      const ratio = charIdx / seg.text.length;
      const split = seg.start + (seg.end - seg.start) * ratio;
      const left: Segment = {
        id: seg.id,
        start: seg.start,
        end: split,
        text: seg.text.slice(0, charIdx).trim(),
      };
      const right: Segment = {
        id: seg.id + 1,
        start: split,
        end: seg.end,
        text: seg.text.slice(charIdx).trim(),
      };
      const next = [...s.segments];
      next.splice(idx, 1, left, right);
      return { segments: renumber(next) };
    }),

  deleteSegment: (id) =>
    set((s) => ({
      segments: renumber(s.segments.filter((seg) => seg.id !== id)),
    })),

  selectSegment: (id) => set({ selectedSegmentId: id }),

  setCfg: (patch) => set((s) => ({ cfg: { ...s.cfg, ...patch } })),

  setExportOptions: (patch) =>
    set((s) => ({ exportOptions: { ...s.exportOptions, ...patch } })),

  setExporting: (exporting, progress) =>
    set({ isExporting: exporting, exportProgress: progress ?? 0 }),

  setExportedFilePath: (path) => set({ exportedFilePath: path }),

  reset: () => set({ ...initialState }),
}));
```

- [ ] **Step 4: テスト実行で成功を確認**

Run: `pnpm test`
Expected: PASS（全ケース）

- [ ] **Step 5: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 6: コミット**

```bash
git add src/stores/appStore.ts src/stores/appStore.test.ts
git commit -m "feat(store): add wizard state with segment edit operations"
```

---

## Phase 2: UI Primitives

### Task 5: Button プリミティブ

**Files:**
- Create: `src/components/Button.tsx`

- [ ] **Step 1: Button.tsx を作成**

```tsx
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "ghost" | "default" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children?: ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-1.5 font-serif text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40";

const variants: Record<Variant, string> = {
  primary:
    "h-9 px-4 rounded-md bg-shiori-500 text-white hover:bg-shiori-600 shadow-warm-sm",
  ghost:
    "h-9 px-3 rounded-md bg-transparent text-ink-700 hover:bg-paper-2",
  default:
    "h-9 px-4 rounded-md bg-paper-0 text-ink-900 border border-paper-edge hover:bg-paper-2",
  icon:
    "h-8 w-8 rounded-md bg-paper-0 text-ink-700 border border-paper-edge hover:bg-paper-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", className = "", children, ...rest }, ref) => (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  ),
);
Button.displayName = "Button";
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/components/Button.tsx
git commit -m "feat(ui): add Button primitive"
```

---

### Task 6: Segmented, Chip, Kbd プリミティブ

**Files:**
- Create: `src/components/Segmented.tsx`
- Create: `src/components/Chip.tsx`
- Create: `src/components/Kbd.tsx`

- [ ] **Step 1: Segmented.tsx を作成**

```tsx
import type { ReactNode } from "react";

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  className?: string;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className = "",
}: SegmentedProps<T>) {
  return (
    <div
      className={`inline-flex rounded-md border border-paper-edge bg-paper-0 p-0.5 ${className}`}
    >
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-3 h-7 rounded-sm text-xs font-serif transition-colors ${
              on
                ? "bg-shiori-500 text-white"
                : "text-ink-700 hover:bg-paper-2"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Chip.tsx を作成**

```tsx
import type { ReactNode } from "react";

type Tone = "accent" | "hisui" | "neutral" | "err";

interface ChipProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

const tones: Record<Tone, string> = {
  accent: "bg-shiori-100 text-shiori-600 border-shiori-400/40",
  hisui: "bg-hisui-100 text-hisui-600 border-hisui-500/30",
  neutral: "bg-paper-2 text-ink-700 border-paper-edge",
  err: "bg-err/10 text-err border-err/30",
};

export function Chip({ tone = "neutral", children, className = "" }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 h-6 rounded-full border text-xs font-mono ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 3: Kbd.tsx を作成**

```tsx
import type { ReactNode } from "react";

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded border border-paper-edge bg-paper-0 text-[10px] font-mono text-ink-500 shadow-warm-sm">
      {children}
    </span>
  );
}
```

- [ ] **Step 4: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 5: コミット**

```bash
git add src/components/Segmented.tsx src/components/Chip.tsx src/components/Kbd.tsx
git commit -m "feat(ui): add Segmented, Chip, Kbd primitives"
```

---

### Task 7: Slider プリミティブ

**Files:**
- Create: `src/components/Slider.tsx`

- [ ] **Step 1: Slider.tsx を作成**

```tsx
interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
  className?: string;
}

export function Slider({
  value,
  min,
  max,
  step = 0.1,
  onChange,
  formatValue,
  className = "",
}: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={className}>
      {formatValue && (
        <div className="mb-2 text-center font-mono text-sm font-semibold text-shiori-500">
          {formatValue(value)}
        </div>
      )}
      <div className="relative h-5">
        <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded bg-paper-3" />
        <div
          className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 rounded bg-shiori-500"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 h-4 w-4 -translate-y-1/2 -translate-x-1/2 rounded-full bg-shiori-500 shadow-warm-sm ring-2 ring-paper-0"
          style={{ left: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/components/Slider.tsx
git commit -m "feat(ui): add Slider primitive"
```

---

## Phase 3: Wizard Chrome

### Task 8: MacWindow + CanvasShell + NavFoot

**Files:**
- Create: `src/components/wizard/MacWindow.tsx`
- Create: `src/components/wizard/CanvasShell.tsx`
- Create: `src/components/wizard/NavFoot.tsx`

- [ ] **Step 1: MacWindow.tsx**

```tsx
import type { ReactNode } from "react";

interface MacWindowProps {
  title: string;
  children: ReactNode;
}

export function MacWindow({ title, children }: MacWindowProps) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-paper-edge bg-paper-1 shadow-warm-lg">
      <div className="flex h-10 items-center border-b border-paper-edge bg-paper-2 px-3">
        <div className="flex gap-2">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 text-center text-xs font-mono text-ink-500">
          {title}
        </div>
        <div className="w-14" />
      </div>
      <div className="flex flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: CanvasShell.tsx**

```tsx
import type { ReactNode } from "react";

interface CanvasShellProps {
  head: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  foot?: ReactNode;
}

export function CanvasShell({ head, right, children, foot }: CanvasShellProps) {
  return (
    <section className="flex flex-1 flex-col overflow-hidden bg-paper-1">
      <header className="flex items-start justify-between gap-6 border-b border-paper-edge px-10 pt-8 pb-6">
        <div>{head}</div>
        {right && <div className="flex items-center gap-3">{right}</div>}
      </header>
      <div className="flex-1 overflow-auto px-10 py-8">{children}</div>
      {foot && (
        <footer className="flex items-center gap-3 border-t border-paper-edge px-10 py-4">
          {foot}
        </footer>
      )}
    </section>
  );
}

interface PageMarkerProps {
  num: number;
  total: number;
}

export function PageMarker({ num, total }: PageMarkerProps) {
  return (
    <div className="text-right font-serif italic text-ink-500">
      <div className="text-[10px] tracking-widest text-ink-300">PAGE</div>
      <div className="text-3xl font-semibold text-ink-900 not-italic">
        {String(num).padStart(2, "0")}
      </div>
      <div className="text-[10px] text-ink-300">— of {String(total).padStart(2, "0")} —</div>
    </div>
  );
}

interface EyebrowProps {
  children: ReactNode;
}

export function Eyebrow({ children }: EyebrowProps) {
  return (
    <div className="text-[11px] font-mono uppercase tracking-widest text-shiori-500">
      — {children}
    </div>
  );
}

interface DisplayHeadingProps {
  children: ReactNode;
}

export function DisplayHeading({ children }: DisplayHeadingProps) {
  return (
    <h1 className="mt-2.5 font-serif text-4xl font-semibold leading-tight tracking-tight text-ink-900">
      {children}
    </h1>
  );
}

interface LedeProps {
  children: ReactNode;
}

export function Lede({ children }: LedeProps) {
  return (
    <div className="mt-3 max-w-[56ch] text-sm text-ink-500">{children}</div>
  );
}
```

- [ ] **Step 3: NavFoot.tsx**

```tsx
import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "../Button";

interface NavFootProps {
  onBack?: () => void;
  onNext?: () => void;
  backDisabled?: boolean;
  nextDisabled?: boolean;
  nextLabel?: string;
  extraLeft?: ReactNode;
  extraRight?: ReactNode;
}

export function NavFoot({
  onBack,
  onNext,
  backDisabled,
  nextDisabled,
  nextLabel = "次へ",
  extraLeft,
  extraRight,
}: NavFootProps) {
  return (
    <>
      {extraLeft}
      <Button variant="ghost" onClick={onBack} disabled={backDisabled}>
        <ArrowLeft className="h-3.5 w-3.5" /> 戻る
      </Button>
      <div className="flex-1" />
      {extraRight}
      <Button variant="primary" onClick={onNext} disabled={nextDisabled}>
        {nextLabel}
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </>
  );
}
```

- [ ] **Step 4: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 5: コミット**

```bash
git add src/components/wizard/
git commit -m "feat(wizard): add MacWindow, CanvasShell, NavFoot chrome"
```

---

### Task 9: Sidebar

**Files:**
- Create: `src/components/wizard/Sidebar.tsx`
- Create: `src/lib/i18n.ts`

- [ ] **Step 1: `src/lib/i18n.ts` を作成**

```typescript
export const t = {
  appTitle: "RepPack",
  appTag: "音読パッケージ・ジェネレーター",
  steps: {
    import: ["読み込む", "音声ファイル"] as const,
    transcribe: ["文に分ける", "自動解析"] as const,
    review: ["微調整", "分割を確認"] as const,
    configure: ["設定", "間と繰り返し"] as const,
    export: ["書き出し", "MP3 を生成"] as const,
  },
  tip: "すべての処理はこのマシンの中で完結します。音声はどこにもアップロードされません。",
  back: "戻る",
  next: "次へ",

  import: {
    h: "ファイルを読み込んでください",
    sub: "練習したい音声をドロップか、ファイルを選んでください。",
    drop: "ドラッグ&ドロップ",
    or: "または",
    pick: "ファイルを選択",
    loaded: "読み込み済み",
    formats: "MP3 · M4A · WAV · FLAC · OGG   ·   up to 2 h",
    langPick: "音声の言語",
  },
  transcribe: {
    h: "文に分けています",
    sub: "無音区間を目印に、文単位で書き起こしています。",
    stage1: "無音区間の検出",
    stage2: "文字起こし",
    processed: "処理済み",
    remaining: "残り時間の目安",
    latestSegment: "直近のセグメント",
    segmentsDetected: "検出済みセグメント",
  },
  review: {
    h: "分割を微調整する",
    sub: "不自然な区切りを見つけたら、結合や分割で整えてください。",
    viewParagraph: "原稿ビュー",
    viewSegments: "セグメント一覧",
    legendMerge: "クリックで結合",
    legendSplit: "文中でクリックして分割",
  },
  configure: {
    h: "練習の設定を決める",
    sub: "モードと間の長さ、繰り返す回数を選びます。",
    mode: "練習モード",
    modeRepeat: "リピーティング",
    modeRepeatDesc: "原音 → ポーズ ×N（発音を真似する）",
    modeOverlap: "オーバーラッピング",
    modeOverlapDesc: "原音をそのまま再生（被せて読む、ポーズなし）",
    pause: "ポーズの長さ",
    pausePreset: "プリセット",
    pauseRatio: "セグメント長に対して",
    speed: "再生速度",
    repeats: "繰り返し回数",
    summary: "パッケージ概要",
    summaryDur: "推定再生時間",
    summarySegs: "セグメント",
    summarySize: "推定ファイルサイズ",
  },
  export: {
    h: "パッケージを書き出します",
    sub: "左でプレビューを聴いて、右で保存先を決めてください。",
    format: "書き出し形式",
    bitrate: "ビットレート",
    where: "保存先",
    go: "書き出す",
    ok: "書き出しが完了しました",
    openFolder: "フォルダを開く",
    newPackage: "新しいパッケージ",
  },
  errors: {
    fileFormat: "この形式はまだ対応していません",
    fileFormatBody: "MP3・M4A・WAV・FLAC・OGG に変換してください。",
    fileCorrupt: "ファイルが読み取れません",
    fileCorruptBody: "ヘッダーが壊れている可能性があります。別のファイルで試してください。",
    sidecarStart: "解析エンジンの起動に失敗しました",
    retry: "再試行",
  },
};
```

- [ ] **Step 2: `src/components/wizard/Sidebar.tsx` を作成**

```tsx
import { Check, ChevronRight } from "lucide-react";
import { t } from "../../lib/i18n";
import type { WizardStep } from "../../lib/types";

const STEP_KEYS = ["import", "transcribe", "review", "configure", "export"] as const;

interface SidebarProps {
  current: WizardStep;
  onStep: (step: WizardStep) => void;
}

export function Sidebar({ current, onStep }: SidebarProps) {
  return (
    <aside
      className="flex w-64 flex-col gap-5 border-r border-paper-edge bg-paper-2 px-4 py-5"
      style={{
        backgroundImage:
          "linear-gradient(180deg, transparent 0, transparent 31px, oklch(from var(--color-ink-900) l c h / 0.025) 31px, oklch(from var(--color-ink-900) l c h / 0.025) 32px)",
        backgroundSize: "100% 32px",
      }}
    >
      <div className="flex items-center gap-3 px-1">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-shiori-500 font-serif text-xl font-bold text-white shadow-warm-sm">
          R
        </div>
        <div>
          <div className="font-serif text-base font-semibold text-ink-900">
            {t.appTitle}
          </div>
          <div className="text-[10px] text-ink-500">{t.appTag}</div>
        </div>
      </div>

      <div className="px-1 font-serif text-[11px] italic tracking-wide text-ink-500">
        the workflow
      </div>

      <nav className="flex flex-col gap-1">
        {STEP_KEYS.map((key, i) => {
          const [label, sub] = t.steps[key];
          const isCurrent = i === current;
          const isDone = i < current;
          const clickable = isDone || isCurrent;
          return (
            <button
              key={key}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStep(i as WizardStep)}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${
                isCurrent ? "bg-shiori-100" : "hover:bg-paper-3/60"
              } ${clickable ? "cursor-pointer" : "cursor-default"}`}
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-semibold ${
                  isDone
                    ? "bg-hisui-500 text-white"
                    : isCurrent
                      ? "bg-shiori-500 text-white"
                      : "bg-paper-0 text-ink-500 border border-paper-edge"
                }`}
              >
                {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : String(i + 1).padStart(2, "0")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-ink-900">{label}</div>
                <div className="text-[11px] text-ink-500">{sub}</div>
              </div>
              {isCurrent && <ChevronRight className="h-3.5 w-3.5 text-shiori-500" />}
            </button>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="rounded-md border border-paper-edge bg-paper-0 p-3">
        <div className="mb-2 font-mono text-[9px] font-bold uppercase tracking-widest text-shiori-500">
          ☕ TIP
        </div>
        <div className="font-serif text-[11px] leading-relaxed text-ink-700">
          {t.tip}
        </div>
      </div>

      <div className="text-center font-serif text-[10px] italic text-ink-300">
        vol.1 · issue 03 · 2026
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
git add src/components/wizard/Sidebar.tsx src/lib/i18n.ts
git commit -m "feat(wizard): add Sidebar with step navigation and i18n strings"
```

---

## Phase 4: Backend — import_audio Extension

### Task 10: Rust `import_audio` を symphonia で拡張

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/commands/import.rs`

- [ ] **Step 1: Cargo.toml に symphonia 追加**

`[dependencies]` セクションに追記:

```toml
symphonia = { version = "0.5", features = ["mp3", "aac", "isomp4", "flac", "vorbis", "wav"] }
```

- [ ] **Step 2: `src-tauri/src/commands/import.rs` を書き換え**

```rust
use serde::Serialize;
use std::fs;
use std::path::Path;
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;

#[derive(Debug, Serialize)]
pub struct FileMeta {
    #[serde(rename = "sizeBytes")]
    pub size_bytes: u64,
    #[serde(rename = "durationSec")]
    pub duration_sec: f64,
    #[serde(rename = "sampleRateHz")]
    pub sample_rate_hz: u32,
    pub channels: u32,
}

#[derive(Debug, Serialize)]
pub struct AudioFileInfo {
    pub path: String,
    pub name: String,
    pub meta: FileMeta,
}

const SUPPORTED_EXTENSIONS: &[&str] = &["mp3", "m4a", "wav", "flac", "ogg", "opus"];

#[tauri::command]
pub async fn import_audio(path: String) -> Result<AudioFileInfo, String> {
    let file_path = Path::new(&path);

    if !file_path.exists() {
        return Err("File not found".into());
    }

    let extension = file_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    if !SUPPORTED_EXTENSIONS.contains(&extension.as_str()) {
        return Err(format!(
            "Unsupported format: .{}. Supported: {}",
            extension,
            SUPPORTED_EXTENSIONS.join(", ")
        ));
    }

    let name = file_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    let size_bytes = fs::metadata(file_path)
        .map_err(|e| format!("Failed to read file size: {e}"))?
        .len();

    let file = fs::File::open(file_path).map_err(|e| format!("Failed to open file: {e}"))?;
    let mss = MediaSourceStream::new(Box::new(file), Default::default());

    let mut hint = Hint::new();
    hint.with_extension(&extension);

    let probed = symphonia::default::get_probe()
        .format(
            &hint,
            mss,
            &FormatOptions::default(),
            &MetadataOptions::default(),
        )
        .map_err(|e| format!("Failed to probe audio: {e}"))?;

    let format = probed.format;
    let track = format
        .default_track()
        .ok_or_else(|| "No audio track found".to_string())?;

    let codec_params = &track.codec_params;
    let sample_rate_hz = codec_params.sample_rate.unwrap_or(0);
    let channels = codec_params
        .channels
        .map(|c| c.count() as u32)
        .unwrap_or(0);

    let duration_sec = match (codec_params.n_frames, codec_params.sample_rate) {
        (Some(frames), Some(rate)) if rate > 0 => frames as f64 / rate as f64,
        _ => 0.0,
    };

    Ok(AudioFileInfo {
        path,
        name,
        meta: FileMeta {
            size_bytes,
            duration_sec,
            sample_rate_hz,
            channels,
        },
    })
}
```

- [ ] **Step 3: ビルド確認**

Run: `cd src-tauri && cargo check`
Expected: `Compiling symphonia ...` → `Finished`

- [ ] **Step 4: コミット**

```bash
git add src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/src/commands/import.rs
git commit -m "feat(tauri): extend import_audio with symphonia-based metadata"
```

---

### Task 11: フロント側 tauriCommands/types を同期

**Files:**
- Modify: `src/lib/tauriCommands.ts`

- [ ] **Step 1: `tauriCommands.ts` を書き換え**

```typescript
import { invoke } from "@tauri-apps/api/core";
import type { Cfg, ExportOptions, FileMeta, Segment } from "./types";

export interface AudioFileInfo {
  path: string;
  name: string;
  meta: FileMeta;
}

export async function importAudio(path: string): Promise<AudioFileInfo> {
  return invoke("import_audio", { path });
}

export async function startSidecar(): Promise<void> {
  return invoke("start_sidecar");
}

export async function stopSidecar(): Promise<void> {
  return invoke("stop_sidecar");
}

export async function requestTranscription(
  filePath: string,
  language?: string,
): Promise<void> {
  return invoke("request_transcription", { filePath, language });
}

export interface ExportRequest {
  filePath: string;
  segments: Segment[];
  cfg: Cfg;
  format: ExportOptions["format"];
  bitrateKbps: number;
  outputPath: string;
}

export async function requestExport(req: ExportRequest): Promise<void> {
  return invoke("request_export", {
    filePath: req.filePath,
    segments: req.segments,
    cfg: req.cfg,
    format: req.format,
    bitrateKbps: req.bitrateKbps,
    outputPath: req.outputPath,
  });
}
```

- [ ] **Step 2: 型チェック（この段階では import.rs の戻り値と一致、export.rs はまだ未更新なので失敗する可能性あり）**

Run: `npx tsc --noEmit`
Expected: フロントのみの型整合性エラーは出ないはず（Rust 側引数は別言語なので型チェックは走らない）

- [ ] **Step 3: コミット**

```bash
git add src/lib/tauriCommands.ts
git commit -m "feat(bridge): sync importAudio return shape and add ExportRequest"
```

---

## Phase 5: Step 1 — Import

### Task 12: StepImport 実装

**Files:**
- Create: `src/features/StepImport/index.tsx`
- Create: `src/features/StepImport/components/DropZone.tsx`
- Create: `src/features/StepImport/components/LoadedFile.tsx`

- [ ] **Step 1: DropZone.tsx**

```tsx
import { Folder, Upload } from "lucide-react";
import { Button } from "../../../components/Button";
import { t } from "../../../lib/i18n";

interface DropZoneProps {
  hover: boolean;
  onHoverChange: (hover: boolean) => void;
  onPickFile: () => void;
  error: string | null;
}

export function DropZone({ hover, onHoverChange, onPickFile, error }: DropZoneProps) {
  const borderClass = error
    ? "border-err/50 bg-err/5"
    : hover
      ? "border-shiori-500 bg-shiori-100/30"
      : "border-paper-edge bg-paper-0";

  return (
    <div
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      onClick={() => !error && onPickFile()}
      className={`flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center transition-colors ${borderClass}`}
    >
      {error ? (
        <div className="space-y-3">
          <div className="text-xl font-serif font-semibold text-err">
            {error === "format" ? t.errors.fileFormat : t.errors.fileCorrupt}
          </div>
          <div className="max-w-[380px] font-serif text-sm italic text-ink-500">
            {error === "format" ? t.errors.fileFormatBody : t.errors.fileCorruptBody}
          </div>
          <Button variant="primary" onClick={(e) => { e.stopPropagation(); onPickFile(); }}>
            <Folder className="h-3.5 w-3.5" /> 別のファイルを選ぶ
          </Button>
        </div>
      ) : (
        <>
          <div
            className={`mb-5 flex h-18 w-18 items-center justify-center rounded-full border border-dashed border-shiori-500/40 bg-shiori-100/40 text-shiori-500 transition-transform ${
              hover ? "scale-105 -rotate-3" : ""
            }`}
            style={{ width: 72, height: 72 }}
          >
            <Upload className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <div className="font-serif text-2xl font-semibold text-ink-900">
            {t.import.drop}
          </div>
          <div className="mt-1 font-serif text-sm italic text-ink-500">
            音声ファイルをここにドロップ
          </div>
          <div className="my-4 flex items-center gap-3 font-serif text-xs italic text-ink-500">
            <span className="h-px w-9 bg-paper-edge" />
            {t.import.or}
            <span className="h-px w-9 bg-paper-edge" />
          </div>
          <Button variant="primary" onClick={(e) => { e.stopPropagation(); onPickFile(); }}>
            <Folder className="h-3.5 w-3.5" /> {t.import.pick}
          </Button>
          <div className="mt-6 font-mono text-[10px] tracking-widest text-ink-300">
            {t.import.formats}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: LoadedFile.tsx**

```tsx
import { Check, Music, X } from "lucide-react";
import { Button } from "../../../components/Button";
import { Chip } from "../../../components/Chip";
import { t } from "../../../lib/i18n";
import type { FileMeta } from "../../../lib/types";

interface LoadedFileProps {
  name: string;
  meta: FileMeta;
  onRemove: () => void;
}

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtBytes(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

export function LoadedFile({ name, meta, onRemove }: LoadedFileProps) {
  return (
    <div className="rounded-lg border border-paper-edge bg-paper-0 p-4">
      <div className="flex items-center gap-3 rounded-md border border-paper-edge bg-paper-2 p-3">
        <div className="flex h-13 w-13 items-center justify-center rounded-md border border-hisui-500/30 bg-hisui-100 text-hisui-600" style={{ width: 52, height: 52 }}>
          <Music className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="truncate font-mono text-sm font-semibold text-ink-900">{name}</div>
          <div className="mt-0.5 font-mono text-xs text-ink-500">
            {fmtDuration(meta.durationSec)} · {fmtBytes(meta.sizeBytes)} · {Math.round(meta.sampleRateHz / 1000)} kHz · {meta.channels === 1 ? "mono" : "stereo"}
          </div>
        </div>
        <Chip tone="accent">
          <Check className="h-3 w-3" strokeWidth={2.5} /> {t.import.loaded}
        </Chip>
        <Button variant="icon" onClick={onRemove}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: StepImport/index.tsx**

```tsx
import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useAppStore } from "../../stores/appStore";
import { importAudio } from "../../lib/tauriCommands";
import { CanvasShell, DisplayHeading, Eyebrow, Lede, PageMarker } from "../../components/wizard/CanvasShell";
import { NavFoot } from "../../components/wizard/NavFoot";
import { Segmented } from "../../components/Segmented";
import { t } from "../../lib/i18n";
import { DropZone } from "./components/DropZone";
import { LoadedFile } from "./components/LoadedFile";

const LANG_OPTIONS = [
  { value: "auto", label: "自動" },
  { value: "en", label: "EN" },
  { value: "ja", label: "JA" },
  { value: "es", label: "ES" },
  { value: "fr", label: "FR" },
  { value: "de", label: "DE" },
  { value: "zh", label: "ZH" },
  { value: "ko", label: "KO" },
];

export function StepImport() {
  const sourceFileName = useAppStore((s) => s.sourceFileName);
  const fileMeta = useAppStore((s) => s.fileMeta);
  const sourceLang = useAppStore((s) => s.sourceLang);
  const setSourceFile = useAppStore((s) => s.setSourceFile);
  const clearSourceFile = useAppStore((s) => s.clearSourceFile);
  const setSourceLang = useAppStore((s) => s.setSourceLang);
  const setStep = useAppStore((s) => s.setStep);

  const [hover, setHover] = useState(false);
  const [error, setError] = useState<"format" | "corrupt" | null>(null);

  const pickFile = async () => {
    setError(null);
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Audio", extensions: ["mp3", "m4a", "wav", "flac", "ogg", "opus"] }],
      });
      if (!selected || typeof selected !== "string") return;
      const info = await importAudio(selected);
      setSourceFile(info.path, info.name, info.meta);
    } catch (e) {
      const msg = String(e);
      if (msg.toLowerCase().includes("unsupported")) {
        setError("format");
      } else {
        setError("corrupt");
      }
      clearSourceFile();
    }
  };

  return (
    <CanvasShell
      head={
        <div>
          <Eyebrow>STEP 01 · IMPORT</Eyebrow>
          <DisplayHeading>{t.import.h}</DisplayHeading>
          <Lede>{t.import.sub}</Lede>
        </div>
      }
      right={<PageMarker num={1} total={5} />}
      foot={
        <NavFoot
          backDisabled
          nextDisabled={!sourceFileName || !fileMeta}
          onNext={() => setStep(1)}
        />
      }
    >
      <div className="grid grid-cols-[1.35fr_1fr] gap-9">
        <div className="space-y-4">
          {sourceFileName && fileMeta && !error ? (
            <LoadedFile
              name={sourceFileName}
              meta={fileMeta}
              onRemove={() => {
                clearSourceFile();
                setError(null);
              }}
            />
          ) : (
            <DropZone
              hover={hover}
              onHoverChange={setHover}
              onPickFile={pickFile}
              error={error}
            />
          )}
          <div>
            <div className="mb-2 text-xs font-mono uppercase tracking-wider text-ink-500">
              {t.import.langPick}
            </div>
            <Segmented
              value={sourceLang}
              onChange={setSourceLang}
              options={LANG_OPTIONS}
            />
          </div>
        </div>
        <aside className="font-serif">
          <div className="mb-2 text-xs italic text-ink-500">¶ formats</div>
          <div className="mb-4 text-lg font-semibold text-ink-900">対応形式</div>
          <div className="text-sm text-ink-700 leading-relaxed">
            MP3 · M4A · WAV · FLAC · OGG · Opus
            <br />
            <span className="text-ink-300">最大 2 時間 · 48 kHz まで</span>
          </div>
        </aside>
      </div>
    </CanvasShell>
  );
}
```

- [ ] **Step 4: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 5: コミット**

```bash
git add src/features/StepImport/
git commit -m "feat(step1): implement Import step with file picker and metadata display"
```

---

## Phase 6: Step 2 — Transcribe

### Task 13: Python サイドカーに phase 情報を追加

**Files:**
- Modify: `python-sidecar/reppack_sidecar/transcriber.py`

- [ ] **Step 1: `transcriber.py` を置換**

```python
import logging
from typing import Generator

logger = logging.getLogger("reppack-sidecar")

_model = None


def get_model(model_size: str = "large-v3-turbo"):
    global _model
    if _model is None:
        from faster_whisper import WhisperModel

        logger.info("Loading model: %s", model_size)
        _model = WhisperModel(model_size, device="cpu", compute_type="int8")
        logger.info("Model loaded successfully")
    return _model


def transcribe(
    file_path: str, language: str | None = None
) -> Generator[dict, None, None]:
    yield {
        "status": "progress",
        "payload": {
            "phase": 0,
            "percent": 5,
            "message": "Probing audio",
            "segments_so_far": 0,
        },
    }

    model = get_model()

    yield {
        "status": "progress",
        "payload": {
            "phase": 0,
            "percent": 15,
            "message": "Silence detection complete",
            "segments_so_far": 0,
        },
    }

    segments, info = model.transcribe(file_path, language=language, beam_size=5)

    result_segments = []
    for i, segment in enumerate(segments):
        result_segments.append(
            {
                "id": i + 1,
                "start": round(segment.start, 3),
                "end": round(segment.end, 3),
                "text": segment.text.strip(),
            }
        )
        estimated_pct = 15 + min(80, len(result_segments) * 2)
        yield {
            "status": "progress",
            "payload": {
                "phase": 1,
                "percent": estimated_pct,
                "message": f"Segment {len(result_segments)}",
                "segments_so_far": len(result_segments),
                "latest_text": segment.text.strip(),
            },
        }

    yield {
        "status": "success",
        "payload": {
            "segments": result_segments,
            "language": info.language,
            "duration": info.duration,
        },
    }
```

- [ ] **Step 2: コミット**

```bash
git add python-sidecar/reppack_sidecar/transcriber.py
git commit -m "feat(sidecar): emit phase info (0=silence, 1=transcribe) in progress"
```

---

### Task 14: useSidecar の phase 処理

**Files:**
- Modify: `src/hooks/useSidecar.ts`

- [ ] **Step 1: `useSidecar.ts` の progress ハンドラを修正**

既存の progress ハンドラブロックを以下に置換:

```typescript
if (response.status === "progress") {
  const payload = response.payload;
  const percent = (payload.percent as number) ?? 0;
  const message = (payload.message as string) ?? "";
  const phase = (payload.phase as 0 | 1 | undefined);
  const latestText = (payload.latest_text as string | undefined);

  setProcessingProgress(percent, message, phase);
  if (latestText) {
    useAppStore.getState().setLatestTranscript(latestText);
  }
}
```

同じファイル冒頭の import に追加:

```typescript
import { useAppStore } from "../stores/appStore";
```

（既に import があるが `setLatestTranscript` が参照されるように `useAppStore` を import）

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/hooks/useSidecar.ts
git commit -m "feat(bridge): forward phase and latest_text from sidecar progress"
```

---

### Task 15: StepTranscribe 実装

**Files:**
- Create: `src/features/StepTranscribe/index.tsx`
- Create: `src/features/StepTranscribe/components/PhaseProgress.tsx`
- Create: `src/features/StepTranscribe/components/TranscriptStream.tsx`

- [ ] **Step 1: PhaseProgress.tsx**

```tsx
interface PhaseProgressProps {
  phase: 0 | 1;
  percent: number;
  processedSec: number;
  totalSec: number;
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function PhaseProgress({ phase, percent, processedSec, totalSec }: PhaseProgressProps) {
  const remainSec = Math.max(1, Math.round(((100 - percent) / 100) * totalSec * 0.8));
  return (
    <div className="rounded-xl border border-paper-edge bg-paper-0 p-7 shadow-warm-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="font-mono text-[11px] tracking-widest text-ink-500">
          {phase === 0 ? "PHASE 1 / 2" : "PHASE 2 / 2"}
        </div>
        <div className="flex-1 h-px bg-paper-edge" />
      </div>
      <div className="mb-5 font-serif text-xl font-semibold text-ink-900">
        {phase === 0 ? "無音区間の検出" : "文字起こし"}
      </div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-paper-3">
        <div
          className="h-full rounded-full bg-shiori-500 transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex justify-between font-mono text-xs text-ink-700">
        <span>{Math.round(percent)}%</span>
        <span>
          処理済み <strong className="text-ink-900">{fmt(processedSec)}</strong> / {fmt(totalSec)}
        </span>
        <span>
          {percent < 100 ? (
            <>残り時間: <strong className="text-ink-900">~{remainSec}s</strong></>
          ) : (
            <strong className="text-ok">完了</strong>
          )}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TranscriptStream.tsx**

```tsx
interface TranscriptStreamProps {
  latestText: string;
}

export function TranscriptStream({ latestText }: TranscriptStreamProps) {
  return (
    <div className="mt-6 border-t border-dashed border-paper-edge pt-5">
      <div className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink-500">
        直近のセグメント
      </div>
      <div className="font-serif text-base leading-relaxed text-ink-900 min-h-[44px]">
        {latestText || <span className="text-ink-300">…</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: StepTranscribe/index.tsx**

```tsx
import { useEffect, useRef } from "react";
import { useAppStore } from "../../stores/appStore";
import { useSidecar } from "../../hooks/useSidecar";
import { requestTranscription } from "../../lib/tauriCommands";
import {
  CanvasShell,
  DisplayHeading,
  Eyebrow,
  Lede,
  PageMarker,
} from "../../components/wizard/CanvasShell";
import { Button } from "../../components/Button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { t } from "../../lib/i18n";
import { PhaseProgress } from "./components/PhaseProgress";
import { TranscriptStream } from "./components/TranscriptStream";

export function StepTranscribe() {
  const sourceFilePath = useAppStore((s) => s.sourceFilePath);
  const sourceLang = useAppStore((s) => s.sourceLang);
  const fileMeta = useAppStore((s) => s.fileMeta);
  const sidecarStatus = useAppStore((s) => s.sidecarStatus);
  const segments = useAppStore((s) => s.segments);
  const processingProgress = useAppStore((s) => s.processingProgress);
  const transcribePhase = useAppStore((s) => s.transcribePhase);
  const latestTranscript = useAppStore((s) => s.latestTranscript);
  const setStep = useAppStore((s) => s.setStep);
  const setSidecarStatus = useAppStore((s) => s.setSidecarStatus);
  const setProcessingProgress = useAppStore((s) => s.setProcessingProgress);

  const { start: startSidecar } = useSidecar();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    if (!sourceFilePath) return;
    if (segments.length > 0) return;
    startedRef.current = true;

    (async () => {
      try {
        if (sidecarStatus !== "ready") {
          await startSidecar();
        }
        setSidecarStatus("processing");
        setProcessingProgress(0, "Starting", 0);
        await requestTranscription(sourceFilePath, sourceLang === "auto" ? undefined : sourceLang);
      } catch (e) {
        console.error("Transcription failed:", e);
        setSidecarStatus("error");
        setProcessingProgress(0, String(e));
      }
    })();
  }, [sourceFilePath, sourceLang, sidecarStatus, segments.length, startSidecar, setSidecarStatus, setProcessingProgress]);

  const totalSec = fileMeta?.durationSec ?? 0;
  const processedSec = Math.round((processingProgress / 100) * totalSec);
  const isDone = segments.length > 0;

  return (
    <CanvasShell
      head={
        <div>
          <Eyebrow>STEP 02 · ANALYZE</Eyebrow>
          <DisplayHeading>{t.transcribe.h}</DisplayHeading>
          <Lede>{t.transcribe.sub}</Lede>
        </div>
      }
      right={<PageMarker num={2} total={5} />}
      foot={
        <>
          <Button variant="ghost" onClick={() => setStep(0)}>
            <ArrowLeft className="h-3.5 w-3.5" /> 戻る
          </Button>
          <div className="flex-1" />
          <Button
            variant="primary"
            onClick={() => setStep(2)}
            disabled={!isDone}
          >
            {isDone ? "次へ" : `${Math.floor(processingProgress)}%`}
            {isDone && <ArrowRight className="h-3.5 w-3.5" />}
          </Button>
        </>
      }
    >
      <div className="mx-auto max-w-[720px]">
        <PhaseProgress
          phase={transcribePhase}
          percent={isDone ? 100 : processingProgress}
          processedSec={processedSec}
          totalSec={totalSec}
        />
        {transcribePhase === 1 && <TranscriptStream latestText={latestTranscript} />}
        {sidecarStatus === "error" && (
          <div className="mt-6 rounded-md border border-err/30 bg-err/10 p-4 text-sm text-err">
            {t.errors.sidecarStart}
            <button
              className="ml-3 underline"
              onClick={() => {
                startedRef.current = false;
                setSidecarStatus("idle");
              }}
            >
              {t.errors.retry}
            </button>
          </div>
        )}
      </div>
    </CanvasShell>
  );
}
```

- [ ] **Step 4: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 5: コミット**

```bash
git add src/features/StepTranscribe/
git commit -m "feat(step2): implement Transcribe step with phase-aware progress"
```

---

## Phase 7: Step 3 — Review

### Task 16: StepReview 実装

**Files:**
- Create: `src/features/StepReview/index.tsx`
- Create: `src/features/StepReview/components/ParagraphView.tsx`
- Create: `src/features/StepReview/components/SegmentList.tsx`
- Create: `src/features/StepReview/components/TimelineBar.tsx`

- [ ] **Step 1: TimelineBar.tsx**

```tsx
import type { Segment } from "../../../lib/types";

interface TimelineBarProps {
  segments: Segment[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ds = Math.floor((sec % 1) * 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${ds}`;
}

export function TimelineBar({ segments, selectedId, onSelect }: TimelineBarProps) {
  if (segments.length === 0) return null;
  const total = segments[segments.length - 1].end - segments[0].start;
  const startSec = segments[0].start;
  const endSec = segments[segments.length - 1].end;

  return (
    <div className="rounded-lg border border-paper-edge bg-paper-0 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-widest text-shiori-500">
          timeline
        </span>
        <span className="font-mono text-[11px] text-ink-500">
          {fmt(startSec)} — {fmt(endSec)} · {total.toFixed(1)}s
        </span>
      </div>
      <div className="flex h-8 gap-0.5 overflow-hidden rounded">
        {segments.map((s) => {
          const dur = s.end - s.start;
          const w = (dur / total) * 100;
          const isSel = s.id === selectedId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              className={`px-1.5 text-left font-mono text-[10px] text-white transition-opacity ${
                isSel ? "bg-shiori-500 opacity-100" : "bg-hisui-500 opacity-55"
              }`}
              style={{ flex: `0 0 ${w}%` }}
              title={`#${s.id} · ${dur.toFixed(1)}s`}
            >
              {w > 12 && `#${s.id}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: ParagraphView.tsx**

```tsx
import type { Segment } from "../../../lib/types";

interface ParagraphViewProps {
  segments: Segment[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onMergeBefore: (id: number) => void;
}

export function ParagraphView({ segments, selectedId, onSelect, onMergeBefore }: ParagraphViewProps) {
  return (
    <div className="rounded-lg border border-paper-edge bg-paper-0 px-8 py-7 min-h-[340px]">
      <div className="mb-4 font-serif italic text-xs text-ink-500">¶ transcript</div>
      <p className="font-serif text-lg leading-[1.9] text-ink-900" style={{ textWrap: "pretty" }}>
        {segments.map((s, i) => (
          <span key={s.id}>
            <span
              onClick={() => onSelect(s.id)}
              title={`#${s.id}`}
              className={`cursor-pointer rounded px-0.5 transition-colors ${
                selectedId === s.id
                  ? "bg-marker border-b-2 border-marker-line"
                  : "hover:bg-paper-2"
              }`}
            >
              {s.text}
            </span>
            {i < segments.length - 1 && (
              <button
                type="button"
                onClick={() => onMergeBefore(segments[i + 1].id)}
                className="mx-1 font-mono text-shiori-500 hover:text-shiori-600"
                title="クリックで結合"
              >
                /
              </button>
            )}
          </span>
        ))}
      </p>
      <div className="mt-6 border-t border-paper-edge pt-4 flex gap-4 font-mono text-[11px] text-ink-500">
        <span><span className="text-shiori-500">/</span> クリックで結合</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: SegmentList.tsx**

```tsx
import { Merge, Pause, Pencil, Play, Scissors, Trash } from "lucide-react";
import { Button } from "../../../components/Button";
import type { Segment } from "../../../lib/types";

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ds = Math.floor((sec % 1) * 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${ds}`;
}

interface SegmentListProps {
  segments: Segment[];
  selectedId: number | null;
  playingId: number | null;
  onSelect: (id: number) => void;
  onTogglePlay: (id: number) => void;
  onMerge: (id: number) => void;
  onDelete: (id: number) => void;
}

export function SegmentList({ segments, selectedId, playingId, onSelect, onTogglePlay, onMerge, onDelete }: SegmentListProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-paper-edge bg-paper-0">
      {segments.map((s, i) => {
        const isSelected = s.id === selectedId;
        const isPlaying = s.id === playingId;
        const dur = s.end - s.start;
        return (
          <div
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`grid cursor-pointer grid-cols-[44px_82px_1fr_auto] items-start gap-3 px-4 py-4 transition-colors ${
              isSelected ? "bg-shiori-100/40 border-l-[3px] border-shiori-500" : "border-l-[3px] border-transparent"
            } ${i > 0 ? "border-t border-paper-edge" : ""}`}
          >
            <div className="font-mono text-[11px] text-ink-500 pt-1">
              #{String(s.id).padStart(2, "0")}
            </div>
            <div className="font-mono text-[11px] text-ink-700 leading-snug">
              <div>{fmt(s.start)}</div>
              <div className="text-ink-300">{fmt(s.end)}</div>
              <div className="text-shiori-500 mt-1">{dur.toFixed(1)}s</div>
            </div>
            <div className="font-serif text-base text-ink-900 leading-snug">
              {s.text}
            </div>
            <div className={`flex gap-1 ${isSelected ? "opacity-100" : "opacity-40"}`}>
              <Button variant="icon" onClick={(e) => { e.stopPropagation(); onTogglePlay(s.id); }}>
                {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </Button>
              <Button variant="icon" onClick={(e) => { e.stopPropagation(); onMerge(s.id); }} disabled={s.id === 1}>
                <Merge className="h-3 w-3" />
              </Button>
              <Button variant="icon" disabled>
                <Scissors className="h-3 w-3" />
              </Button>
              <Button variant="icon" disabled>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="icon" onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}>
                <Trash className="h-3 w-3" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: StepReview/index.tsx**

```tsx
import { useEffect, useState } from "react";
import { FileText, Layers } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import {
  CanvasShell,
  DisplayHeading,
  Eyebrow,
  Lede,
  PageMarker,
} from "../../components/wizard/CanvasShell";
import { NavFoot } from "../../components/wizard/NavFoot";
import { Segmented } from "../../components/Segmented";
import { Chip } from "../../components/Chip";
import { Kbd } from "../../components/Kbd";
import { t } from "../../lib/i18n";
import { ParagraphView } from "./components/ParagraphView";
import { SegmentList } from "./components/SegmentList";
import { TimelineBar } from "./components/TimelineBar";

type View = "paragraph" | "segments";

export function StepReview() {
  const segments = useAppStore((s) => s.segments);
  const selectedId = useAppStore((s) => s.selectedSegmentId);
  const selectSegment = useAppStore((s) => s.selectSegment);
  const mergeSegments = useAppStore((s) => s.mergeSegments);
  const deleteSegment = useAppStore((s) => s.deleteSegment);
  const setStep = useAppStore((s) => s.setStep);

  const [view, setView] = useState<View>("paragraph");
  const [playingId, setPlayingId] = useState<number | null>(null);

  useEffect(() => {
    if (selectedId === null && segments.length > 0) {
      selectSegment(segments[0].id);
    }
  }, [segments, selectedId, selectSegment]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedId) return;
      if (e.key === "m" || e.key === "M") mergeSegments(selectedId);
      if (e.key === "Backspace") deleteSegment(selectedId);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, mergeSegments, deleteSegment]);

  return (
    <CanvasShell
      head={
        <div>
          <Eyebrow>STEP 03 · REVIEW</Eyebrow>
          <DisplayHeading>{t.review.h}</DisplayHeading>
          <Lede>{t.review.sub}</Lede>
        </div>
      }
      right={<PageMarker num={3} total={5} />}
      foot={
        <NavFoot
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
          extraLeft={
            <div className="ml-1 flex items-center gap-2 text-[11px] text-ink-500">
              <Kbd>M</Kbd> 結合
              <Kbd>⌫</Kbd> 削除
            </div>
          }
        />
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Segmented
            value={view}
            onChange={(v) => setView(v as View)}
            options={[
              { value: "paragraph", label: (<><FileText className="h-3 w-3" /> {t.review.viewParagraph}</>) },
              { value: "segments", label: (<><Layers className="h-3 w-3" /> {t.review.viewSegments}</>) },
            ]}
          />
          <div className="flex-1" />
          <Chip tone="hisui">
            <Layers className="h-3 w-3" /> {segments.length} セグメント
          </Chip>
        </div>

        <TimelineBar segments={segments} selectedId={selectedId} onSelect={selectSegment} />

        {view === "paragraph" ? (
          <ParagraphView
            segments={segments}
            selectedId={selectedId}
            onSelect={selectSegment}
            onMergeBefore={mergeSegments}
          />
        ) : (
          <SegmentList
            segments={segments}
            selectedId={selectedId}
            playingId={playingId}
            onSelect={selectSegment}
            onTogglePlay={(id) => setPlayingId((cur) => (cur === id ? null : id))}
            onMerge={mergeSegments}
            onDelete={deleteSegment}
          />
        )}
      </div>
    </CanvasShell>
  );
}
```

- [ ] **Step 5: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 6: コミット**

```bash
git add src/features/StepReview/
git commit -m "feat(step3): implement Review step with paragraph/segment views"
```

---

## Phase 8: Step 4 — Configure

### Task 17: StepConfigure 実装

**Files:**
- Create: `src/features/StepConfigure/index.tsx`
- Create: `src/features/StepConfigure/components/ModeSelect.tsx`
- Create: `src/features/StepConfigure/components/PauseControl.tsx`
- Create: `src/features/StepConfigure/components/SummaryCard.tsx`

- [ ] **Step 1: ModeSelect.tsx**

```tsx
import type { PracticeMode } from "../../../lib/types";
import { t } from "../../../lib/i18n";

interface ModeSelectProps {
  value: PracticeMode;
  onChange: (v: PracticeMode) => void;
}

const MODES: { id: PracticeMode; label: string; desc: string; pattern: string[] }[] = [
  { id: "repeat", label: t.configure.modeRepeat, desc: t.configure.modeRepeatDesc, pattern: ["A", "P×N"] },
  { id: "overlap", label: t.configure.modeOverlap, desc: t.configure.modeOverlapDesc, pattern: ["A"] },
];

export function ModeSelect({ value, onChange }: ModeSelectProps) {
  return (
    <div>
      <div className="mb-2.5 text-xs font-mono uppercase tracking-wider text-ink-500">
        {t.configure.mode}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {MODES.map((m) => {
          const on = value === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(m.id)}
              className={`rounded-lg border p-4 text-left transition ${
                on
                  ? "border-shiori-500 bg-paper-0 ring-[3px] ring-shiori-100"
                  : "border-paper-edge bg-transparent"
              }`}
            >
              <div className="mb-1 font-serif text-base font-semibold text-ink-900">
                {m.label}
              </div>
              <div className="mb-3 font-mono text-[11px] leading-relaxed text-ink-500">
                {m.desc}
              </div>
              <div className="flex h-7 items-center gap-1">
                {m.pattern.map((p, i) => {
                  const isPause = p.startsWith("P");
                  return (
                    <div
                      key={i}
                      className={`${isPause ? "h-[3px] bg-paper-edge" : "h-4"} flex-1 rounded-[2px] ${
                        isPause
                          ? "bg-ink-300/50"
                          : on
                            ? "bg-shiori-500"
                            : "bg-ink-500"
                      }`}
                    />
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: PauseControl.tsx**

```tsx
import { Segmented } from "../../../components/Segmented";
import { Slider } from "../../../components/Slider";
import { t } from "../../../lib/i18n";
import type { Cfg } from "../../../lib/types";

interface PauseControlProps {
  cfg: Cfg;
  onChange: (patch: Partial<Cfg>) => void;
}

export function PauseControl({ cfg, onChange }: PauseControlProps) {
  return (
    <div className="rounded-lg border border-paper-edge bg-paper-0 p-5">
      <div className="mb-3 flex items-center">
        <div className="flex-1 font-serif text-sm font-semibold text-ink-900">
          {t.configure.pause}
        </div>
        <Segmented
          value={cfg.pauseKind}
          onChange={(v) => onChange({ pauseKind: v })}
          options={[
            { value: "preset", label: t.configure.pausePreset },
            { value: "ratio", label: t.configure.pauseRatio },
          ]}
        />
      </div>

      {cfg.pauseKind === "preset" ? (
        <div className="flex flex-wrap gap-2">
          {[1.0, 1.5, 2.0, 3.0].map((v) => {
            const on = cfg.pausePreset === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => onChange({ pausePreset: v })}
                className={`rounded-md border px-4 py-2.5 font-mono text-sm transition-colors ${
                  on
                    ? "border-shiori-500 bg-shiori-500 text-white"
                    : "border-paper-edge bg-paper-0 text-ink-900"
                }`}
              >
                {v.toFixed(1)}s
              </button>
            );
          })}
        </div>
      ) : (
        <Slider
          value={cfg.pauseRatio}
          min={0.5}
          max={3}
          onChange={(v) => onChange({ pauseRatio: v })}
          formatValue={(v) => `×${v.toFixed(1)} セグメント長`}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: SummaryCard.tsx**

```tsx
import { t } from "../../../lib/i18n";
import type { Cfg, Segment } from "../../../lib/types";

interface SummaryCardProps {
  cfg: Cfg;
  segments: Segment[];
}

function estimate(cfg: Cfg, segments: Segment[]) {
  const segCount = segments.length;
  const audioTotal = segments.reduce((a, s) => a + (s.end - s.start), 0);
  const avgSegLen = segCount > 0 ? audioTotal / segCount : 0;
  const isOverlap = cfg.mode === "overlap";
  const pauseLen = isOverlap
    ? 0
    : cfg.pauseKind === "preset"
      ? cfg.pausePreset
      : cfg.pauseRatio * avgSegLen;
  const repeats = isOverlap ? 1 : cfg.repeats;
  const perSeg = avgSegLen + pauseLen * repeats;
  const totalSec = (perSeg * segCount) / cfg.speed;
  const mb = (totalSec * 0.016).toFixed(1);
  return { totalSec, segCount, mb };
}

export function SummaryCard({ cfg, segments }: SummaryCardProps) {
  const { totalSec, segCount, mb } = estimate(cfg, segments);
  const mins = Math.floor(totalSec / 60);
  const secs = Math.round(totalSec % 60);

  return (
    <div className="relative overflow-hidden rounded-xl border border-paper-edge bg-paper-2 p-6">
      {/* bookmark ribbon */}
      <div
        className="absolute right-5 -top-1 h-15 w-7 bg-shiori-500 shadow-warm-sm"
        style={{
          height: 60,
          width: 28,
          clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)",
        }}
      />
      <div className="mb-4 font-serif text-lg font-semibold text-ink-900">
        {t.configure.summary}
      </div>
      <div className="flex flex-col gap-3">
        <Row label={t.configure.summaryDur} value={`${mins}:${String(secs).padStart(2, "0")}`} big />
        <Row label={t.configure.summarySegs} value={`${segCount}`} />
        <Row label={t.configure.summarySize} value={`~ ${mb} MB`} />
      </div>
      <div className="mt-4 border-t border-dashed border-paper-edge pt-3">
        <div className="mb-2 text-xs font-mono uppercase tracking-wider text-ink-500">
          パターン
        </div>
        <PatternPreview cfg={cfg} />
      </div>
    </div>
  );
}

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs text-ink-500">{label}</span>
      <span
        className={
          big
            ? "font-serif text-3xl font-semibold text-ink-900 tracking-tight"
            : "font-mono text-sm font-medium text-ink-900"
        }
      >
        {value}
      </span>
    </div>
  );
}

function PatternPreview({ cfg }: { cfg: Cfg }) {
  const isOverlap = cfg.mode === "overlap";
  const blocks: { type: "a" | "p"; label?: string }[] = [];
  for (let i = 0; i < 2; i++) {
    blocks.push({ type: "a", label: `#${i + 1}` });
    if (!isOverlap) {
      for (let r = 0; r < cfg.repeats; r++) blocks.push({ type: "p" });
    }
  }
  return (
    <div className="flex h-7 items-center gap-1">
      {blocks.map((b, i) => (
        <div
          key={i}
          className={`rounded-[2px] font-mono text-[9px] text-white flex items-center justify-center ${
            b.type === "a" ? "h-4.5 bg-hisui-500" : "h-[3px] bg-ink-300"
          }`}
          style={{ flex: b.type === "a" ? 2 : 1, height: b.type === "a" ? 18 : 3 }}
        >
          {b.label}
        </div>
      ))}
      <span className="ml-1 font-mono text-[10px] text-ink-300">…</span>
    </div>
  );
}
```

- [ ] **Step 4: StepConfigure/index.tsx**

```tsx
import { Minus, Plus } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import {
  CanvasShell,
  DisplayHeading,
  Eyebrow,
  Lede,
  PageMarker,
} from "../../components/wizard/CanvasShell";
import { NavFoot } from "../../components/wizard/NavFoot";
import { Button } from "../../components/Button";
import { t } from "../../lib/i18n";
import { ModeSelect } from "./components/ModeSelect";
import { PauseControl } from "./components/PauseControl";
import { SummaryCard } from "./components/SummaryCard";

export function StepConfigure() {
  const cfg = useAppStore((s) => s.cfg);
  const segments = useAppStore((s) => s.segments);
  const setCfg = useAppStore((s) => s.setCfg);
  const setStep = useAppStore((s) => s.setStep);

  const isOverlap = cfg.mode === "overlap";

  return (
    <CanvasShell
      head={
        <div>
          <Eyebrow>STEP 04 · CONFIGURE</Eyebrow>
          <DisplayHeading>{t.configure.h}</DisplayHeading>
          <Lede>{t.configure.sub}</Lede>
        </div>
      }
      right={<PageMarker num={4} total={5} />}
      foot={<NavFoot onBack={() => setStep(2)} onNext={() => setStep(4)} />}
    >
      <div className="grid grid-cols-[1.5fr_1fr] gap-6">
        <div className="flex flex-col gap-5">
          <ModeSelect value={cfg.mode} onChange={(v) => setCfg({ mode: v })} />
          {!isOverlap && <PauseControl cfg={cfg} onChange={setCfg} />}

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-paper-edge bg-paper-0 p-4">
              <div className="mb-2.5 font-serif text-sm font-semibold">{t.configure.speed}</div>
              <div className="flex gap-1.5">
                {[0.75, 1.0, 1.25, 1.5].map((v) => {
                  const on = cfg.speed === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setCfg({ speed: v })}
                      className={`flex-1 min-w-[38px] rounded border py-2 font-mono text-xs transition-colors ${
                        on
                          ? "border-shiori-500 bg-shiori-500 text-white"
                          : "border-paper-edge bg-paper-0 text-ink-900"
                      }`}
                    >
                      ×{v}
                    </button>
                  );
                })}
              </div>
            </div>

            {!isOverlap && (
              <div className="rounded-lg border border-paper-edge bg-paper-0 p-4">
                <div className="mb-2.5 font-serif text-sm font-semibold">
                  {t.configure.repeats}
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="icon"
                    onClick={() => setCfg({ repeats: Math.max(1, cfg.repeats - 1) })}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <div className="flex-1 text-center font-serif text-3xl font-semibold">
                    {cfg.repeats}
                  </div>
                  <Button
                    variant="icon"
                    onClick={() => setCfg({ repeats: Math.min(10, cfg.repeats + 1) })}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="mt-1 text-center font-mono text-[11px] text-ink-500">
                  × per segment
                </div>
              </div>
            )}
          </div>
        </div>

        <SummaryCard cfg={cfg} segments={segments} />
      </div>
    </CanvasShell>
  );
}
```

- [ ] **Step 5: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 6: コミット**

```bash
git add src/features/StepConfigure/
git commit -m "feat(step4): implement Configure step with mode/pause/speed/repeats"
```

---

## Phase 9: Step 5 — Export (Backend + Frontend)

### Task 18: Rust `request_export` を拡張

**Files:**
- Modify: `src-tauri/src/commands/export.rs`

- [ ] **Step 1: `export.rs` を書き換え**

```rust
use tauri::State;

use crate::sidecar::manager::SidecarManager;
use crate::sidecar::protocol::SidecarRequest;

#[tauri::command]
pub async fn request_export(
    manager: State<'_, SidecarManager>,
    file_path: String,
    segments: serde_json::Value,
    cfg: serde_json::Value,
    format: String,
    bitrate_kbps: u32,
    output_path: String,
) -> Result<(), String> {
    let id = uuid::Uuid::new_v4().to_string();
    let request = SidecarRequest {
        action: "insert_pauses".into(),
        id,
        payload: serde_json::json!({
            "file_path": file_path,
            "segments": segments,
            "cfg": cfg,
            "format": format,
            "bitrate_kbps": bitrate_kbps,
            "output_path": output_path,
        }),
    };

    manager.send(&request).await
}
```

- [ ] **Step 2: ビルド確認**

Run: `cd src-tauri && cargo check`
Expected: Finished without errors

- [ ] **Step 3: コミット**

```bash
git add src-tauri/src/commands/export.rs
git commit -m "feat(tauri): extend request_export with cfg/format/bitrate"
```

---

### Task 19: Python `audio_processor` を cfg ベースに改修

**Files:**
- Modify: `python-sidecar/reppack_sidecar/audio_processor.py`

- [ ] **Step 1: `audio_processor.py` を全面書き換え**

```python
import logging
from typing import Generator

from pydub import AudioSegment

logger = logging.getLogger("reppack-sidecar")


def _apply_speed(chunk: AudioSegment, speed: float) -> AudioSegment:
    if abs(speed - 1.0) < 1e-3:
        return chunk
    new_frame_rate = int(chunk.frame_rate * speed)
    altered = chunk._spawn(chunk.raw_data, overrides={"frame_rate": new_frame_rate})
    return altered.set_frame_rate(chunk.frame_rate)


def insert_pauses(
    file_path: str,
    segments: list[dict],
    cfg: dict,
    format: str,
    bitrate_kbps: int,
    output_path: str,
) -> Generator[dict, None, None]:
    suffix = file_path.rsplit(".", 1)[-1].lower()
    if suffix == "mp3":
        audio = AudioSegment.from_mp3(file_path)
    elif suffix in ("m4a", "mp4"):
        audio = AudioSegment.from_file(file_path, format="mp4")
    elif suffix == "wav":
        audio = AudioSegment.from_wav(file_path)
    elif suffix == "flac":
        audio = AudioSegment.from_file(file_path, format="flac")
    elif suffix in ("ogg", "opus"):
        audio = AudioSegment.from_ogg(file_path)
    else:
        audio = AudioSegment.from_file(file_path)

    yield {"status": "progress", "payload": {"percent": 5, "message": "Loaded audio"}}

    mode = cfg.get("mode", "repeat")
    speed = float(cfg.get("speed", 1.0))
    repeats = int(cfg.get("repeats", 2))
    pause_kind = cfg.get("pauseKind", "preset")
    pause_preset = float(cfg.get("pausePreset", 1.5))
    pause_ratio = float(cfg.get("pauseRatio", 1.2))

    output = AudioSegment.empty()
    total = len(segments)

    for i, seg in enumerate(segments):
        start_ms = int(seg["start"] * 1000)
        end_ms = int(seg["end"] * 1000)
        chunk = audio[start_ms:end_ms]
        seg_sec = (end_ms - start_ms) / 1000.0
        chunk = _apply_speed(chunk, speed)

        if mode == "overlap":
            output += chunk
        else:  # repeat
            output += chunk
            pause_sec = pause_preset if pause_kind == "preset" else pause_ratio * seg_sec
            silent = AudioSegment.silent(duration=int(pause_sec * 1000))
            for _ in range(repeats):
                output += silent

        percent = 5 + int(85 * (i + 1) / total)
        yield {
            "status": "progress",
            "payload": {"percent": percent, "message": f"Processing segment {i + 1}/{total}"},
        }

    export_params = {"format": format}
    if format in ("mp3", "m4a"):
        export_params["bitrate"] = f"{bitrate_kbps}k"

    output.export(output_path, **export_params)
    yield {"status": "progress", "payload": {"percent": 100, "message": "Export complete"}}
    yield {"status": "success", "payload": {"output_path": output_path}}
```

- [ ] **Step 2: main dispatcher のペイロード抽出を更新**

`python-sidecar/reppack_sidecar/__main__.py` の `insert_pauses` 分岐を以下に置換:

```python
elif request.action == "insert_pauses":
    for update in insert_pauses(
        request.payload["file_path"],
        request.payload["segments"],
        request.payload["cfg"],
        request.payload["format"],
        request.payload["bitrate_kbps"],
        request.payload["output_path"],
    ):
        send_response({"id": request.id, **update})
```

- [ ] **Step 3: コミット**

```bash
git add python-sidecar/reppack_sidecar/audio_processor.py python-sidecar/reppack_sidecar/__main__.py
git commit -m "feat(sidecar): cfg-aware pause insertion with speed/format/bitrate"
```

---

### Task 20: StepExport 実装

**Files:**
- Create: `src/features/StepExport/index.tsx`
- Create: `src/features/StepExport/components/PreviewPlayer.tsx`
- Create: `src/features/StepExport/components/ExportOptions.tsx`

- [ ] **Step 1: PreviewPlayer.tsx**

```tsx
import { useEffect, useState } from "react";
import { Headphones, Pause, Play } from "lucide-react";
import { Button } from "../../../components/Button";
import { Chip } from "../../../components/Chip";
import type { Cfg, Segment } from "../../../lib/types";

interface PreviewPlayerProps {
  cfg: Cfg;
  segments: Segment[];
  onPlay: () => void;
  onPause: () => void;
  isPlaying: boolean;
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function PreviewPlayer({ cfg, segments, onPlay, onPause, isPlaying }: PreviewPlayerProps) {
  const [pos, setPos] = useState(0);
  const totalSec = segments.reduce((a, s) => a + (s.end - s.start), 0);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => setPos((p) => (p >= totalSec ? 0 : p + 0.1)), 100);
    return () => clearInterval(id);
  }, [isPlaying, totalSec]);

  const activeIdx = (() => {
    let acc = 0;
    for (let i = 0; i < segments.length; i++) {
      acc += segments[i].end - segments[i].start;
      if (pos <= acc) return i;
    }
    return segments.length - 1;
  })();

  return (
    <div className="overflow-hidden rounded-lg border border-paper-edge bg-paper-0">
      <div className="flex items-center gap-3 border-b border-paper-edge px-5 py-3">
        <Chip tone="accent">
          <Headphones className="h-3 w-3" /> Preview
        </Chip>
        <span className="font-mono text-[11px] text-ink-500">
          {cfg.mode} · ×{cfg.speed} · pause{" "}
          {cfg.pauseKind === "preset" ? `×${cfg.pausePreset}` : `ratio ${cfg.pauseRatio}`}
        </span>
      </div>

      <div className="border-b border-paper-edge px-6 py-5 font-serif text-base leading-relaxed text-ink-900 min-h-[180px]">
        {segments.map((s, i) => (
          <span
            key={s.id}
            className={`mr-1 transition-opacity ${
              i === activeIdx ? "opacity-100 bg-marker px-0.5 border-b-2 border-marker-line" : "opacity-40"
            }`}
          >
            {s.text}{" "}
          </span>
        ))}
      </div>

      <div className="bg-paper-2 px-6 pt-5 pb-4">
        <div className="flex items-center gap-4">
          <Button
            variant="primary"
            className="h-10 w-10 rounded-full !p-0"
            onClick={() => (isPlaying ? onPause() : onPlay())}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <div className="flex-1 flex justify-between font-mono text-[11px] text-ink-500">
            <span>{fmt(pos)}</span>
            <span>—</span>
            <span>{fmt(totalSec)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: ExportOptions.tsx**

```tsx
import { Folder } from "lucide-react";
import { Segmented } from "../../../components/Segmented";
import { Button } from "../../../components/Button";
import { t } from "../../../lib/i18n";
import type { ExportOptions as Opts } from "../../../lib/types";

interface ExportOptionsProps {
  options: Opts;
  onChange: (patch: Partial<Opts>) => void;
  onPickDir: () => void;
}

export function ExportOptionsPanel({ options, onChange, onPickDir }: ExportOptionsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-paper-edge bg-paper-0 p-4">
        <div className="mb-2.5 text-xs font-mono uppercase tracking-wider text-ink-500">
          {t.export.format}
        </div>
        <Segmented
          className="w-full"
          value={options.format}
          onChange={(v) => onChange({ format: v as Opts["format"] })}
          options={[
            { value: "mp3", label: "MP3" },
            { value: "m4a", label: "M4A" },
            { value: "wav", label: "WAV" },
          ]}
        />
        {options.format !== "wav" && (
          <select
            className="mt-2 w-full rounded-md border border-paper-edge bg-paper-0 px-3 py-2 font-mono text-sm"
            value={options.bitrateKbps}
            onChange={(e) => onChange({ bitrateKbps: parseInt(e.target.value) })}
          >
            {[128, 192, 256, 320].map((v) => (
              <option key={v} value={v}>{v} kbps</option>
            ))}
          </select>
        )}
      </div>

      <div className="rounded-lg border border-paper-edge bg-paper-0 p-4">
        <div className="mb-2.5 text-xs font-mono uppercase tracking-wider text-ink-500">
          {t.export.where}
        </div>
        <Button
          variant="default"
          className="w-full justify-start font-mono text-xs"
          onClick={onPickDir}
        >
          <Folder className="h-3.5 w-3.5" />
          {options.outputDir ?? "~/Documents/RepPack/"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: StepExport/index.tsx**

```tsx
import { useCallback, useEffect, useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { Check, Download, Sparkles } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { useAudioPlayer } from "../../hooks/useAudioPlayer";
import { requestExport } from "../../lib/tauriCommands";
import {
  CanvasShell,
  DisplayHeading,
  Eyebrow,
  Lede,
  PageMarker,
} from "../../components/wizard/CanvasShell";
import { Button } from "../../components/Button";
import { t } from "../../lib/i18n";
import { PreviewPlayer } from "./components/PreviewPlayer";
import { ExportOptionsPanel } from "./components/ExportOptions";
import { ArrowLeft } from "lucide-react";

export function StepExport() {
  const sourceFilePath = useAppStore((s) => s.sourceFilePath);
  const sourceFileName = useAppStore((s) => s.sourceFileName);
  const segments = useAppStore((s) => s.segments);
  const cfg = useAppStore((s) => s.cfg);
  const exportOptions = useAppStore((s) => s.exportOptions);
  const isExporting = useAppStore((s) => s.isExporting);
  const exportProgress = useAppStore((s) => s.exportProgress);
  const exportedFilePath = useAppStore((s) => s.exportedFilePath);
  const setExportOptions = useAppStore((s) => s.setExportOptions);
  const setExporting = useAppStore((s) => s.setExporting);
  const setExportedFilePath = useAppStore((s) => s.setExportedFilePath);
  const setStep = useAppStore((s) => s.setStep);
  const reset = useAppStore((s) => s.reset);

  const player = useAudioPlayer();
  const pauseMsFromCfg = cfg.pauseKind === "preset" ? cfg.pausePreset * 1000 : cfg.pauseRatio * 1500;

  useEffect(() => {
    if (sourceFilePath && !player.isLoaded) {
      player.load(sourceFilePath).catch(console.error);
    }
  }, [sourceFilePath, player]);

  const handleExport = useCallback(async () => {
    if (!sourceFilePath || !sourceFileName) return;
    const defaultName = sourceFileName.replace(/\.[^.]+$/, "") + `.pack.${exportOptions.format}`;
    const outputPath = await save({
      defaultPath: defaultName,
      filters: [{ name: exportOptions.format.toUpperCase(), extensions: [exportOptions.format] }],
    });
    if (!outputPath) return;

    setExporting(true, 0);
    setExportedFilePath(null);
    try {
      await requestExport({
        filePath: sourceFilePath,
        segments,
        cfg,
        format: exportOptions.format,
        bitrateKbps: exportOptions.bitrateKbps,
        outputPath,
      });
      setExportedFilePath(outputPath);
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      setExporting(false);
    }
  }, [sourceFilePath, sourceFileName, segments, cfg, exportOptions, setExporting, setExportedFilePath]);

  const onPickDir = async () => {
    const dir = await save({ defaultPath: "~/Documents/RepPack/" });
    if (dir) setExportOptions({ outputDir: dir });
  };

  return (
    <CanvasShell
      head={
        <div>
          <Eyebrow>STEP 05 · EXPORT</Eyebrow>
          <DisplayHeading>{t.export.h}</DisplayHeading>
          <Lede>{t.export.sub}</Lede>
        </div>
      }
      right={<PageMarker num={5} total={5} />}
      foot={
        <>
          <Button variant="ghost" onClick={() => setStep(3)}>
            <ArrowLeft className="h-3.5 w-3.5" /> 戻る
          </Button>
          <div className="flex-1" />
          {exportedFilePath ? (
            <>
              <Button
                variant="default"
                onClick={() => {
                  reset();
                }}
              >
                <Sparkles className="h-3.5 w-3.5" /> {t.export.newPackage}
              </Button>
              <Button
                variant="primary"
                onClick={() => revealItemInDir(exportedFilePath)}
              >
                <Download className="h-3.5 w-3.5" /> {t.export.openFolder}
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              onClick={handleExport}
              disabled={isExporting}
              className="min-w-[180px]"
            >
              {isExporting ? (
                <>書き出し中… {Math.floor(exportProgress)}%</>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" /> {t.export.go}
                </>
              )}
            </Button>
          )}
        </>
      }
    >
      <div className="grid grid-cols-[1.2fr_1fr] gap-6">
        <PreviewPlayer
          cfg={cfg}
          segments={segments}
          isPlaying={player.isPlaying}
          onPlay={() => player.playWithGaps(segments, pauseMsFromCfg)}
          onPause={player.pause}
        />
        <div>
          <ExportOptionsPanel
            options={exportOptions}
            onChange={setExportOptions}
            onPickDir={onPickDir}
          />
          {exportedFilePath && (
            <div className="mt-3 flex items-center gap-2 rounded-md border border-ok/30 bg-ok/10 p-3 text-ok">
              <Check className="h-4 w-4" strokeWidth={3} />
              <div className="text-sm">{t.export.ok}</div>
            </div>
          )}
        </div>
      </div>
    </CanvasShell>
  );
}
```

- [ ] **Step 4: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 5: コミット**

```bash
git add src/features/StepExport/
git commit -m "feat(step5): implement Export step with preview, options, and export flow"
```

---

## Phase 10: Wizard Shell + Cleanup

### Task 21: ルート `index.tsx` をウィザードシェルに置換

**Files:**
- Modify: `src/routes/index.tsx`
- Modify: `src/routes/__root.tsx`

- [ ] **Step 1: `src/routes/__root.tsx` から ProgressOverlay 削除**

```tsx
import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <main className="flex h-screen flex-col bg-paper-1">
      <Outlet />
    </main>
  );
}
```

- [ ] **Step 2: `src/routes/index.tsx` を全面書き換え**

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAppStore } from "../stores/appStore";
import { MacWindow } from "../components/wizard/MacWindow";
import { Sidebar } from "../components/wizard/Sidebar";
import { StepImport } from "../features/StepImport";
import { StepTranscribe } from "../features/StepTranscribe";
import { StepReview } from "../features/StepReview";
import { StepConfigure } from "../features/StepConfigure";
import { StepExport } from "../features/StepExport";
import { t } from "../lib/i18n";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  const step = useAppStore((s) => s.step);
  const setStep = useAppStore((s) => s.setStep);
  const sourceFileName = useAppStore((s) => s.sourceFileName);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && step > 0) {
        setStep((step - 1) as typeof step);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, setStep]);

  const title = `${t.appTitle}${sourceFileName ? ` — ${sourceFileName}` : ""}`;

  const stepCmp = [
    <StepImport key={0} />,
    <StepTranscribe key={1} />,
    <StepReview key={2} />,
    <StepConfigure key={3} />,
    <StepExport key={4} />,
  ][step];

  return (
    <div className="h-full p-6">
      <MacWindow title={title}>
        <Sidebar current={step} onStep={setStep} />
        {stepCmp}
      </MacWindow>
    </div>
  );
}
```

- [ ] **Step 3: 型チェック**

Run: `npx tsc --noEmit`
Expected: `ProgressOverlay` 等への参照が残っている場合はこのステップで表面化する

- [ ] **Step 4: コミット**

```bash
git add src/routes/__root.tsx src/routes/index.tsx
git commit -m "feat(routes): wire wizard shell in index route"
```

---

### Task 22: 旧コンポーネントを削除

**Files:**
- Delete: `src/components/FileImport.tsx`
- Delete: `src/components/SegmentList.tsx`
- Delete: `src/components/Player.tsx`
- Delete: `src/components/PauseControl.tsx`
- Delete: `src/components/ExportButton.tsx`
- Delete: `src/components/ProgressOverlay.tsx`

- [ ] **Step 1: 削除**

```bash
rm src/components/FileImport.tsx \
   src/components/SegmentList.tsx \
   src/components/Player.tsx \
   src/components/PauseControl.tsx \
   src/components/ExportButton.tsx \
   src/components/ProgressOverlay.tsx
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし（どこからも import されていないため）

- [ ] **Step 3: テスト実行**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 4: コミット**

```bash
git add -u src/components/
git commit -m "chore: remove legacy UI components absorbed by wizard steps"
```

---

## Phase 11: Verification

### Task 23: ビルド + 動作確認

**Files:** なし

- [ ] **Step 1: TypeScript 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 2: テスト実行**

Run: `pnpm test`
Expected: すべて PASS

- [ ] **Step 3: Rust ビルド**

Run: `cd src-tauri && cargo check`
Expected: warnings のみ、errors なし

- [ ] **Step 4: 開発サーバー起動**

Run: `pnpm tauri dev`
Expected: macOS ウィンドウ風のウィザードが立ち上がる

- [ ] **Step 5: 手動スモークテスト**

以下をユーザー確認（チェックリストとして報告）:

- [ ] MP3 ファイルをドロップ → Step 1 でメタ情報（時間/サイズ/サンプルレート/チャンネル）が表示される
- [ ] 「次へ」活性化 → Step 2 遷移
- [ ] Step 2 で Phase 1 / Phase 2 の表示が切り替わり進捗が進む
- [ ] 完了後 segments 表示 → Step 3 遷移可能
- [ ] Step 3 で「原稿ビュー」と「セグメント一覧」が切替可能
- [ ] スラッシュクリックでマージ動作、`M` キーでもマージ、`⌫` で削除
- [ ] タイムラインバーで選択中のセグメントが栞色ハイライト
- [ ] Step 4 でモード切替 / ポーズプリセット / 速度 / 繰返し回数が操作でき、右カラムの Summary が即時更新される
- [ ] Step 5 でプレビュー再生 → アクティブセグメントが黄色マーカー表示
- [ ] 「書き出す」→ 保存ダイアログ → エクスポート → 「フォルダを開く」動作
- [ ] サイドバーの完了済みステップが翡翠色チェックマーク、現在ステップが栞色ハイライト

- [ ] **Step 6: 不正ファイル確認**

- [ ] `.txt` ファイルをドロップ → "format" エラー表示
- [ ] サイドカー起動失敗時のエラーバナーが表示される

- [ ] **Step 7: 最終コミット（必要に応じて細かい修正）**

問題が出たら修正して追加コミット。問題なければ完了。

---

## 完了条件

- `npx tsc --noEmit` がエラーなく通る
- `pnpm test` が全パス
- `cd src-tauri && cargo check` が errors なしで終わる
- 手動スモークテストの項目がすべて動作する
- デザインの色（栞色プライマリ / 翡翠セカンダリ）が全画面で一貫している
- 日本語 UI のみで動作する
