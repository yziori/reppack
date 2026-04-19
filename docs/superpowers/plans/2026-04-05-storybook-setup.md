# Storybook 導入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 全UIコンポーネントのStorybookストーリーを作成し、Tauri無しでコンポーネントを単体で確認・開発できる環境を構築する。

**Architecture:** Storybook 8 (Vite builder) を導入し、Tailwind CSS v4をStorybookのpreview設定に統合する。Tauri APIとZustandストアはモック/デコレータでラップし、各コンポーネントを独立して描画可能にする。

**Tech Stack:** Storybook 8, @storybook/react-vite, Tailwind CSS v4, Zustand

---

## File Structure

### 新規作成
- `.storybook/main.ts` — Storybook設定（Vite builder + Tailwind plugin）
- `.storybook/preview.ts` — グローバルデコレータ、Tailwind CSS読み込み
- `.storybook/mocks/tauriCommands.ts` — `src/lib/tauriCommands` のモック
- `.storybook/mocks/tauri-dialog.ts` — `@tauri-apps/plugin-dialog` のモック
- `src/components/Player.stories.tsx` — Player のストーリー
- `src/components/PauseControl.stories.tsx` — PauseControl のストーリー
- `src/components/SegmentList.stories.tsx` — SegmentList のストーリー
- `src/components/ProgressOverlay.stories.tsx` — ProgressOverlay のストーリー
- `src/components/FileImport.stories.tsx` — FileImport のストーリー
- `src/components/ExportButton.stories.tsx` — ExportButton のストーリー

### 変更
- `package.json` — Storybook依存追加 + `storybook` / `build-storybook` スクリプト

---

### Task 1: Storybook インストールと基本設定

**Files:**
- Create: `.storybook/main.ts`
- Create: `.storybook/preview.ts`
- Modify: `package.json`

- [ ] **Step 1: Storybook とアドオンをインストール**

```bash
pnpm add -D storybook @storybook/react-vite @storybook/addon-essentials @storybook/addon-interactions @storybook/blocks @storybook/react
```

- [ ] **Step 2: package.json にスクリプトを追加**

`package.json` の `"scripts"` に以下を追加:

```json
"storybook": "storybook dev -p 6006",
"build-storybook": "storybook build"
```

- [ ] **Step 3: `.storybook/main.ts` を作成**

```ts
import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  viteFinal(config) {
    config.plugins = config.plugins ?? [];
    config.plugins.push(tailwindcss());
    return config;
  },
};

export default config;
```

- [ ] **Step 4: `.storybook/preview.ts` を作成**

```ts
import type { Preview } from "@storybook/react";
import "../src/index.css";

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "dark",
      values: [
        { name: "dark", value: "#030712" },
        { name: "light", value: "#ffffff" },
      ],
    },
    layout: "centered",
  },
};

export default preview;
```

- [ ] **Step 5: Storybook が起動することを確認**

```bash
pnpm storybook
```

Expected: ブラウザが開き Storybook UIが表示される（ストーリーはまだ空）。Ctrl+C で終了。

- [ ] **Step 6: コミット**

```bash
git add .storybook/ package.json pnpm-lock.yaml
git commit -m "feat: Storybook 8 の基本設定を追加"
```

---

### Task 2: Tauri API モックの作成

**Files:**
- Create: `.storybook/mocks/tauriCommands.ts`
- Create: `.storybook/mocks/tauri-dialog.ts`
- Modify: `.storybook/main.ts`

- [ ] **Step 1: `.storybook/mocks/tauriCommands.ts` を作成**

```ts
import type { Segment } from "../../src/lib/types";

export async function importAudio(
  _path: string,
): Promise<{ path: string; name: string }> {
  console.log("[mock] importAudio called");
  return { path: "/mock/path/audio.mp3", name: "audio.mp3" };
}

export async function requestExport(
  _sourceFilePath: string,
  _segments: Segment[],
  _pauseDurationMs: number,
  _outputPath: string,
): Promise<void> {
  console.log("[mock] requestExport called");
}
```

- [ ] **Step 2: `.storybook/mocks/tauri-dialog.ts` を作成**

```ts
export async function open(_options?: unknown): Promise<string | null> {
  console.log("[mock] dialog.open called");
  return "/mock/path/audio.mp3";
}

export async function save(_options?: unknown): Promise<string | null> {
  console.log("[mock] dialog.save called");
  return "/mock/path/output.mp3";
}
```

- [ ] **Step 3: `.storybook/main.ts` に Vite alias を追加**

`viteFinal` 内に resolve alias を追加して、Tauri モジュールをモックに差し替える:

```ts
import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  viteFinal(config) {
    config.plugins = config.plugins ?? [];
    config.plugins.push(tailwindcss());

    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...config.resolve.alias,
      "@tauri-apps/plugin-dialog": path.resolve(
        __dirname,
        "mocks/tauri-dialog.ts",
      ),
      "../lib/tauriCommands": path.resolve(
        __dirname,
        "mocks/tauriCommands.ts",
      ),
    };

    return config;
  },
};

export default config;
```

- [ ] **Step 4: コミット**

```bash
git add .storybook/
git commit -m "feat: Storybook 用 Tauri API モックを追加"
```

---

### Task 3: Player ストーリーを作成

**Files:**
- Create: `src/components/Player.stories.tsx`

Player はすべて props ベースなのでモック不要。最もシンプルなコンポーネント。

- [ ] **Step 1: `src/components/Player.stories.tsx` を作成**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { Player } from "./Player";

const meta = {
  title: "Components/Player",
  component: Player,
  args: {
    onPlay: fn(),
    onPause: fn(),
    onResume: fn(),
    onStop: fn(),
  },
} satisfies Meta<typeof Player>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: {
    isPlaying: false,
    isPaused: false,
    isLoaded: true,
    hasSegments: true,
  },
};

export const Playing: Story = {
  args: {
    isPlaying: true,
    isPaused: false,
    isLoaded: true,
    hasSegments: true,
  },
};

export const Paused: Story = {
  args: {
    isPlaying: false,
    isPaused: true,
    isLoaded: true,
    hasSegments: true,
  },
};

export const Disabled: Story = {
  args: {
    isPlaying: false,
    isPaused: false,
    isLoaded: false,
    hasSegments: false,
  },
};
```

- [ ] **Step 2: Storybook で表示を確認**

```bash
pnpm storybook
```

Expected: Components/Player 以下に Idle, Playing, Paused, Disabled の4つのストーリーが表示される。

- [ ] **Step 3: コミット**

```bash
git add src/components/Player.stories.tsx
git commit -m "feat: Player コンポーネントの Storybook ストーリーを追加"
```

---

### Task 4: SegmentList ストーリーを作成

**Files:**
- Create: `src/components/SegmentList.stories.tsx`

SegmentList は props（`onSegmentClick`）+ Zustand ストア（`segments`, `currentSegmentIndex`）を使用。Zustand はモジュールレベルで直接importされているので、ストーリー内でストアの初期値を設定する。

- [ ] **Step 1: `src/components/SegmentList.stories.tsx` を作成**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import type { Decorator } from "@storybook/react";
import { fn } from "@storybook/test";
import { useEffect } from "react";
import { useAppStore } from "../stores/appStore";
import { SegmentList } from "./SegmentList";
import type { Segment } from "../lib/types";

const sampleSegments: Segment[] = [
  { id: 1, start: 0.0, end: 2.5, text: "Hello, how are you?" },
  { id: 2, start: 2.5, end: 5.1, text: "I'm fine, thank you." },
  { id: 3, start: 5.1, end: 8.3, text: "What are you doing today?" },
  { id: 4, start: 8.3, end: 12.0, text: "I'm studying English." },
  { id: 5, start: 12.0, end: 15.7, text: "That sounds great!" },
];

function withStoreState(state: {
  segments?: Segment[];
  currentSegmentIndex?: number;
}): Decorator {
  return (Story) => {
    useEffect(() => {
      if (state.segments) useAppStore.setState({ segments: state.segments });
      if (state.currentSegmentIndex !== undefined)
        useAppStore.setState({
          currentSegmentIndex: state.currentSegmentIndex,
        });
      return () =>
        useAppStore.setState({ segments: [], currentSegmentIndex: 0 });
    }, []);
    return <Story />;
  };
}

const meta = {
  title: "Components/SegmentList",
  component: SegmentList,
  args: {
    onSegmentClick: fn(),
  },
} satisfies Meta<typeof SegmentList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  decorators: [withStoreState({ segments: [] })],
};

export const WithSegments: Story = {
  decorators: [
    withStoreState({ segments: sampleSegments, currentSegmentIndex: 0 }),
  ],
};

export const ThirdSelected: Story = {
  decorators: [
    withStoreState({ segments: sampleSegments, currentSegmentIndex: 2 }),
  ],
};
```

- [ ] **Step 2: Storybook で表示を確認**

```bash
pnpm storybook
```

Expected: Components/SegmentList 以下に Empty, WithSegments, ThirdSelected が表示される。

- [ ] **Step 3: コミット**

```bash
git add src/components/SegmentList.stories.tsx
git commit -m "feat: SegmentList コンポーネントの Storybook ストーリーを追加"
```

---

### Task 5: PauseControl ストーリーを作成

**Files:**
- Create: `src/components/PauseControl.stories.tsx`

PauseControl は Zustand ストアのみ使用。props なし。

- [ ] **Step 1: `src/components/PauseControl.stories.tsx` を作成**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import type { Decorator } from "@storybook/react";
import { useEffect } from "react";
import { useAppStore } from "../stores/appStore";
import { PauseControl } from "./PauseControl";

function withPauseDuration(ms: number): Decorator {
  return (Story) => {
    useEffect(() => {
      useAppStore.setState({ pauseDurationMs: ms });
      return () => useAppStore.setState({ pauseDurationMs: 3000 });
    }, []);
    return <Story />;
  };
}

const meta = {
  title: "Components/PauseControl",
  component: PauseControl,
} satisfies Meta<typeof PauseControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [withPauseDuration(3000)],
};

export const Short: Story = {
  decorators: [withPauseDuration(500)],
};

export const Long: Story = {
  decorators: [withPauseDuration(10000)],
};
```

- [ ] **Step 2: Storybook で表示を確認**

```bash
pnpm storybook
```

Expected: Components/PauseControl 以下に Default, Short, Long が表示され、スライダーが操作可能。

- [ ] **Step 3: コミット**

```bash
git add src/components/PauseControl.stories.tsx
git commit -m "feat: PauseControl コンポーネントの Storybook ストーリーを追加"
```

---

### Task 6: ProgressOverlay ストーリーを作成

**Files:**
- Create: `src/components/ProgressOverlay.stories.tsx`

ProgressOverlay は Zustand ストアのみ使用。`layout: "fullscreen"` が必要（fixed positioning のため）。

- [ ] **Step 1: `src/components/ProgressOverlay.stories.tsx` を作成**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import type { Decorator } from "@storybook/react";
import { useEffect } from "react";
import { useAppStore } from "../stores/appStore";
import { ProgressOverlay } from "./ProgressOverlay";
import type { SidecarStatus } from "../lib/types";

function withOverlayState(state: {
  sidecarStatus: SidecarStatus;
  processingProgress?: number;
  processingMessage?: string;
  isExporting?: boolean;
}): Decorator {
  return (Story) => {
    useEffect(() => {
      useAppStore.setState({
        sidecarStatus: state.sidecarStatus,
        processingProgress: state.processingProgress ?? 0,
        processingMessage: state.processingMessage ?? "",
        isExporting: state.isExporting ?? false,
      });
      return () =>
        useAppStore.setState({
          sidecarStatus: "idle",
          processingProgress: 0,
          processingMessage: "",
          isExporting: false,
        });
    }, []);
    return <Story />;
  };
}

const meta = {
  title: "Components/ProgressOverlay",
  component: ProgressOverlay,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof ProgressOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Hidden: Story = {
  decorators: [withOverlayState({ sidecarStatus: "idle" })],
};

export const Processing: Story = {
  decorators: [
    withOverlayState({
      sidecarStatus: "processing",
      processingProgress: 45,
      processingMessage: "Transcribing audio...",
    }),
  ],
};

export const Exporting: Story = {
  decorators: [
    withOverlayState({
      sidecarStatus: "processing",
      processingProgress: 72,
      processingMessage: "Exporting MP3...",
      isExporting: true,
    }),
  ],
};

export const Error: Story = {
  decorators: [
    withOverlayState({
      sidecarStatus: "error",
      processingMessage: "Failed to load audio file. Please check the file format.",
    }),
  ],
};
```

- [ ] **Step 2: Storybook で表示を確認**

```bash
pnpm storybook
```

Expected: Components/ProgressOverlay 以下に Hidden（何も表示なし）, Processing, Exporting, Error が表示される。

- [ ] **Step 3: コミット**

```bash
git add src/components/ProgressOverlay.stories.tsx
git commit -m "feat: ProgressOverlay コンポーネントの Storybook ストーリーを追加"
```

---

### Task 7: FileImport ストーリーを作成

**Files:**
- Create: `src/components/FileImport.stories.tsx`

FileImport は Zustand ストア + Tauri dialog API + tauriCommands を使用。Task 2 の alias モックにより Tauri 依存は自動解決。

- [ ] **Step 1: `src/components/FileImport.stories.tsx` を作成**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import type { Decorator } from "@storybook/react";
import { useEffect } from "react";
import { useAppStore } from "../stores/appStore";
import { FileImport } from "./FileImport";

function withFileState(state: {
  sourceFileName?: string | null;
}): Decorator {
  return (Story) => {
    useEffect(() => {
      useAppStore.setState({
        sourceFileName: state.sourceFileName ?? null,
        sourceFilePath: state.sourceFileName
          ? `/mock/path/${state.sourceFileName}`
          : null,
      });
      return () =>
        useAppStore.setState({
          sourceFileName: null,
          sourceFilePath: null,
        });
    }, []);
    return <Story />;
  };
}

const meta = {
  title: "Components/FileImport",
  component: FileImport,
} satisfies Meta<typeof FileImport>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  decorators: [withFileState({ sourceFileName: null })],
};

export const FileSelected: Story = {
  decorators: [withFileState({ sourceFileName: "lesson-01.mp3" })],
};
```

- [ ] **Step 2: Storybook で表示を確認**

```bash
pnpm storybook
```

Expected: Components/FileImport 以下に Empty（プレースホルダー表示）, FileSelected（ファイル名表示）が表示される。クリックするとコンソールにモックログが出力される。

- [ ] **Step 3: コミット**

```bash
git add src/components/FileImport.stories.tsx
git commit -m "feat: FileImport コンポーネントの Storybook ストーリーを追加"
```

---

### Task 8: ExportButton ストーリーを作成

**Files:**
- Create: `src/components/ExportButton.stories.tsx`

ExportButton は Zustand ストア + Tauri dialog + tauriCommands を使用。Task 2 の alias モックにより Tauri 依存は自動解決。

- [ ] **Step 1: `src/components/ExportButton.stories.tsx` を作成**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import type { Decorator } from "@storybook/react";
import { useEffect } from "react";
import { useAppStore } from "../stores/appStore";
import { ExportButton } from "./ExportButton";
import type { Segment } from "../lib/types";

const sampleSegments: Segment[] = [
  { id: 1, start: 0.0, end: 2.5, text: "Hello, how are you?" },
  { id: 2, start: 2.5, end: 5.1, text: "I'm fine, thank you." },
];

function withExportState(state: {
  sourceFilePath?: string | null;
  segments?: Segment[];
}): Decorator {
  return (Story) => {
    useEffect(() => {
      useAppStore.setState({
        sourceFilePath: state.sourceFilePath ?? null,
        segments: state.segments ?? [],
      });
      return () =>
        useAppStore.setState({
          sourceFilePath: null,
          segments: [],
        });
    }, []);
    return <Story />;
  };
}

const meta = {
  title: "Components/ExportButton",
  component: ExportButton,
} satisfies Meta<typeof ExportButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Disabled: Story = {
  decorators: [
    withExportState({ sourceFilePath: null, segments: [] }),
  ],
};

export const Ready: Story = {
  decorators: [
    withExportState({
      sourceFilePath: "/mock/path/audio.mp3",
      segments: sampleSegments,
    }),
  ],
};
```

- [ ] **Step 2: Storybook で表示を確認**

```bash
pnpm storybook
```

Expected: Components/ExportButton 以下に Disabled（グレーアウト）, Ready（緑色でクリック可能）が表示される。

- [ ] **Step 3: コミット**

```bash
git add src/components/ExportButton.stories.tsx
git commit -m "feat: ExportButton コンポーネントの Storybook ストーリーを追加"
```

---

### Task 9: 最終確認

- [ ] **Step 1: TypeScript 型チェック**

```bash
npx tsc --noEmit
```

Expected: エラーなし。

- [ ] **Step 2: Storybook ビルド確認**

```bash
pnpm build-storybook
```

Expected: `storybook-static/` ディレクトリが生成される。

- [ ] **Step 3: `.gitignore` に Storybook ビルド出力を追加**

`.gitignore` に以下を追記:

```
storybook-static/
```

- [ ] **Step 4: コミット**

```bash
git add .gitignore
git commit -m "chore: Storybook ビルド出力を .gitignore に追加"
```
