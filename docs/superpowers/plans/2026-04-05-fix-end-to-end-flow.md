# reppack 一連動作修正 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** reppackアプリを「MP3読み込み → 文字起こし → プレビュー再生 → エクスポート」の一連のフローが動作するように修正する

**Architecture:** Rust側のサイドカー起動を、バイナリ依存からPython直接実行に変更。フロントエンドのサイドカーready待ち、進捗表示、プレーヤー状態管理の不整合を修正する。

**Tech Stack:** Tauri v2 (Rust), React + TypeScript, Python (faster-whisper, pydub), Zustand

---

## File Structure

変更対象ファイル一覧:

| File | Responsibility | Action |
|------|---------------|--------|
| `src-tauri/src/sidecar/manager.rs` | サイドカープロセス管理 | Modify: Python直接起動に変更 |
| `src-tauri/capabilities/default.json` | Tauri権限設定 | Modify: execute権限追加 |
| `src/hooks/useSidecar.ts` | サイドカーイベント監視・制御 | Modify: ready待ちPromise化、進捗表示修正 |
| `src/hooks/useAudioPlayer.ts` | 音声再生 | Modify: ストア連携追加 |
| `src/stores/appStore.ts` | 状態管理 | Modify: currentSegmentIndex更新アクション追加 |
| `src/components/Player.tsx` | 再生UIボタン | Modify: Play/Resumeロジック修正 |
| `src/App.tsx` | メインUI | Modify: ready待ち修正、player.load呼び出しタイミング |

---

### Task 1: Rust — サイドカーをPython直接実行に変更

**Files:**
- Modify: `src-tauri/src/sidecar/manager.rs:19-31` (spawn メソッド)
- Modify: `src-tauri/capabilities/default.json`

現状、`shell.sidecar("binaries/reppack-sidecar")` でバイナリを探すが、バイナリが存在しない。
`shell.command("python3")` で `python-sidecar` ディレクトリから `-m reppack_sidecar` を実行する方式に変更する。

- [ ] **Step 1: manager.rs の spawn メソッドを修正**

`src-tauri/src/sidecar/manager.rs` の `spawn` メソッドを以下に書き換える:

```rust
pub async fn spawn(&self, app: &tauri::AppHandle) -> Result<(), String> {
    let mut guard = self.child.lock().await;
    if guard.is_some() {
        return Err("Sidecar is already running".into());
    }

    let shell = app.shell();

    // python-sidecar ディレクトリを解決
    // 開発時: プロジェクトルートの python-sidecar/
    // ビルド時: リソースディレクトリの python-sidecar/
    let resource_dir = app.path().resource_dir().ok();
    let sidecar_dir = resource_dir
        .as_ref()
        .map(|d| d.join("python-sidecar"))
        .filter(|d| d.join("reppack_sidecar").exists())
        .or_else(|| {
            std::env::current_dir()
                .ok()
                .map(|d| d.join("python-sidecar"))
                .filter(|d| d.join("reppack_sidecar").exists())
        })
        .ok_or("Python sidecar directory not found")?;

    let (mut rx, child) = shell
        .command("python3")
        .args(["-m", "reppack_sidecar"])
        .current_dir(sidecar_dir)
        .spawn()
        .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

    *guard = Some(child);
    drop(guard);
```

ファイルの残り（イベントリスナー部分の `let app_handle = app.clone();` 以降）はそのまま。

- [ ] **Step 2: Tauri権限にexecute許可を追加**

`src-tauri/capabilities/default.json` の `permissions` 配列に `"shell:allow-execute"` を追加:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capability for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "opener:default",
    "shell:allow-execute",
    "shell:allow-spawn",
    "shell:allow-stdin-write",
    "shell:allow-kill",
    "dialog:allow-open",
    "dialog:allow-save",
    "dialog:allow-message",
    "dialog:allow-ask",
    "fs:default"
  ]
}
```

- [ ] **Step 3: use文を更新**

`manager.rs` の先頭に `tauri::Manager` トレイトの use を追加（`app.path()` に必要）:

```rust
use tauri::{Emitter, Manager};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tokio::sync::Mutex;

use super::protocol::{SidecarRequest, SidecarResponse};
```

- [ ] **Step 4: Rustコンパイル確認**

Run: `source "$HOME/.cargo/env" && cd src-tauri && cargo check 2>&1 | tail -5`
Expected: `Finished` with no errors

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/sidecar/manager.rs src-tauri/capabilities/default.json
git commit -m "feat: switch sidecar from binary to python3 direct execution"
```

---

### Task 2: フロントエンド — サイドカーready待ちのPromise化

**Files:**
- Modify: `src/hooks/useSidecar.ts`
- Modify: `src/App.tsx:24-36` (handleTranscribe)

現状、`startSidecar()` 後に `setTimeout(1000)` で待っているが、サイドカーの初期化時間が不定。
readyイベントをPromiseで受け取る仕組みに変更する。

- [ ] **Step 1: useSidecar.ts に waitForReady を追加**

`src/hooks/useSidecar.ts` を以下に書き換え:

```typescript
import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { useAppStore } from "../stores/appStore";
import { startSidecar, stopSidecar } from "../lib/tauriCommands";
import type { Segment } from "../lib/types";

interface SidecarResponse {
  id: string;
  status: string;
  payload: Record<string, unknown>;
}

export function useSidecar() {
  const setSidecarStatus = useAppStore((s) => s.setSidecarStatus);
  const setSegments = useAppStore((s) => s.setSegments);
  const setProcessingProgress = useAppStore((s) => s.setProcessingProgress);
  const setExporting = useAppStore((s) => s.setExporting);

  // ready待ちのためのresolverを保持
  const readyResolverRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unlistenOutput = listen<SidecarResponse>(
      "sidecar-output",
      (event) => {
        const response = event.payload;

        if (response.id === "init" && response.status === "ready") {
          setSidecarStatus("ready");
          // readyを待っているPromiseを解決
          if (readyResolverRef.current) {
            readyResolverRef.current();
            readyResolverRef.current = null;
          }
          return;
        }

        if (response.status === "progress") {
          const payload = response.payload;
          const percent = (payload.percent as number) ?? 0;
          const message = (payload.message as string) ?? "";
          // transcribeのprogressはpercentがないのでsegments_so_farから推定
          if (percent === 0 && payload.segments_so_far != null) {
            const segmentsSoFar = payload.segments_so_far as number;
            const latestText = (payload.latest_text as string) ?? "";
            setProcessingProgress(
              Math.min(segmentsSoFar * 2, 95),
              `Segment ${segmentsSoFar}: ${latestText}`,
            );
          } else {
            setProcessingProgress(percent, message);
          }
        }

        if (response.status === "success" && response.payload.segments) {
          const segments = response.payload.segments as Segment[];
          setSegments(segments);
          setSidecarStatus("ready");
          setProcessingProgress(0, "");
        }

        if (
          response.status === "success" &&
          response.payload.output_path
        ) {
          setExporting(false);
          setSidecarStatus("ready");
          setProcessingProgress(0, "");
        }

        if (response.status === "error") {
          setSidecarStatus("error");
          setProcessingProgress(
            0,
            (response.payload.message as string) ?? "Unknown error",
          );
        }
      },
    );

    const unlistenTerminated = listen("sidecar-terminated", () => {
      setSidecarStatus("idle");
    });

    return () => {
      unlistenOutput.then((fn) => fn());
      unlistenTerminated.then((fn) => fn());
    };
  }, [setSidecarStatus, setSegments, setProcessingProgress, setExporting]);

  const start = async () => {
    setSidecarStatus("starting");
    try {
      await startSidecar();
      // readyイベントをPromiseで待つ（タイムアウト10秒）
      await new Promise<void>((resolve, reject) => {
        readyResolverRef.current = resolve;
        setTimeout(() => {
          if (readyResolverRef.current) {
            readyResolverRef.current = null;
            reject(new Error("Sidecar ready timeout"));
          }
        }, 10000);
      });
    } catch (e) {
      setSidecarStatus("error");
      throw e;
    }
  };

  const stop = async () => {
    await stopSidecar();
    setSidecarStatus("idle");
  };

  return { start, stop };
}
```

- [ ] **Step 2: App.tsx の handleTranscribe を修正**

`src/App.tsx` の `handleTranscribe` を修正。setTimeout削除、player.loadをセグメント取得後に移動:

```typescript
const handleTranscribe = useCallback(async () => {
  if (!sourceFilePath) return;

  try {
    if (sidecarStatus !== "ready") {
      await startSidecar();
    }

    setSidecarStatus("processing");
    setProcessingProgress(0, "Starting transcription...");
    await requestTranscription(sourceFilePath);
    // loadはrequestTranscriptionの送信と並行して実行可能
    await player.load(sourceFilePath);
  } catch (e) {
    console.error("Transcription failed:", e);
  }
}, [sourceFilePath, sidecarStatus, startSidecar, setSidecarStatus, player]);
```

App.tsxの先頭のimport/store参照に `setProcessingProgress` を追加:

```typescript
const setProcessingProgress = useAppStore((s) => s.setProcessingProgress);
```

- [ ] **Step 3: TypeScript型チェック**

Run: `npx tsc --noEmit 2>&1`
Expected: エラーなし

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useSidecar.ts src/App.tsx
git commit -m "fix: replace setTimeout with promise-based sidecar ready wait"
```

---

### Task 3: プレーヤー状態とストアの連携修正

**Files:**
- Modify: `src/stores/appStore.ts` (setCurrentSegmentIndex追加)
- Modify: `src/hooks/useAudioPlayer.ts` (ストア更新を追加)
- Modify: `src/components/Player.tsx:36-39` (Play/Resumeロジック修正)

現状の問題:
1. `useAudioPlayer` の `currentSegment` はローカルstateで、ストアの `currentSegmentIndex` は更新されない
2. `SegmentList` はストアの `currentSegmentIndex` を参照するので、再生中のハイライトが動かない
3. `Player.tsx` のPlay/Resumeの条件分岐が逆（停止後にPlayを押すとResumeが呼ばれる）

- [ ] **Step 1: appStore に setCurrentSegmentIndex アクションを追加**

`src/stores/appStore.ts` の `AppState` interface に追加:

```typescript
setCurrentSegmentIndex: (index: number) => void;
```

`create` の中に実装を追加:

```typescript
setCurrentSegmentIndex: (index) => set({ currentSegmentIndex: index }),
```

- [ ] **Step 2: useAudioPlayer でストアを更新**

`src/hooks/useAudioPlayer.ts` にストア連携を追加。

ファイル先頭のimportに追加:

```typescript
import { useAppStore } from "../stores/appStore";
```

`useAudioPlayer` 関数内の冒頭で:

```typescript
const setCurrentSegmentIndex = useAppStore((s) => s.setCurrentSegmentIndex);
```

`playWithGaps` 内の `setCurrentSegment(found)` の後にストア更新を追加:

```typescript
if (found >= 0) {
  setCurrentSegment(found);
  setCurrentSegmentIndex(found);
}
```

`stop` コールバック内も:

```typescript
const stop = useCallback(() => {
  stopAllNodes();
  setIsPlaying(false);
  setCurrentSegment(0);
  setCurrentSegmentIndex(0);
}, [stopAllNodes, setCurrentSegmentIndex]);
```

`seekToSegment` を実際の再生位置変更に修正（現在はstateのみ更新）:

```typescript
const seekToSegment = useCallback(
  (index: number) => {
    setCurrentSegment(index);
    setCurrentSegmentIndex(index);
    // セグメントリストクリック時に該当セグメントから再生開始するには
    // playWithGapsを呼び直す必要があるが、ここではインデックス更新のみ
  },
  [setCurrentSegmentIndex],
);
```

- [ ] **Step 3: Player.tsx のPlay/Resumeロジックを修正**

`src/components/Player.tsx` の再生ボタンのonClickを修正。

現状（バグ）:
```typescript
onClick={canPlay ? (isLoaded ? onResume : onPlay) : undefined}
```

修正後:
```typescript
onClick={onPlay}
```

ここで `onPlay` は `App.tsx` の `handlePlay` で、常に `playWithGaps` を呼ぶ。
ただし、一時停止からの復帰も必要なので、`Player.tsx` にpaused状態を追加する。

`src/components/Player.tsx` の `PlayerProps` に `isPaused` を追加:

```typescript
interface PlayerProps {
  isPlaying: boolean;
  isPaused: boolean;
  isLoaded: boolean;
  hasSegments: boolean;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}
```

コンポーネント引数に `isPaused` を追加し、再生ボタンを修正:

```typescript
export function Player({
  isPlaying,
  isPaused,
  isLoaded,
  hasSegments,
  onPlay,
  onPause,
  onResume,
  onStop,
}: PlayerProps) {
  const canPlay = isLoaded && hasSegments;

  return (
    <div className="flex items-center gap-2">
      {isPlaying ? (
        <button
          className="rounded-lg bg-gray-700 p-2 text-white transition-colors hover:bg-gray-600"
          onClick={onPause}
        >
          <Pause className="h-5 w-5" />
        </button>
      ) : (
        <button
          className="rounded-lg bg-blue-600 p-2 text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!canPlay}
          onClick={isPaused ? onResume : onPlay}
        >
          <Play className="h-5 w-5" />
        </button>
      )}
      <button
        className="rounded-lg bg-gray-700 p-2 text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!isPlaying && !isPaused}
        onClick={onStop}
      >
        <Square className="h-4 w-4" />
      </button>
    </div>
  );
}
```

- [ ] **Step 4: useAudioPlayer に isPaused 状態を追加**

`src/hooks/useAudioPlayer.ts` の interface と実装に `isPaused` を追加:

```typescript
interface UseAudioPlayerReturn {
  load: (filePath: string) => Promise<void>;
  playWithGaps: (segments: Segment[], pauseMs: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seekToSegment: (index: number) => void;
  isPlaying: boolean;
  isPaused: boolean;
  currentSegment: number;
  isLoaded: boolean;
}
```

state追加:

```typescript
const [isPaused, setIsPaused] = useState(false);
```

`playWithGaps` 内の `setIsPlaying(true)` の後に追加:

```typescript
setIsPaused(false);
```

`pause` を修正:

```typescript
const pause = useCallback(() => {
  const ctx = audioContextRef.current;
  if (ctx && ctx.state === "running") {
    ctx.suspend();
    setIsPlaying(false);
    setIsPaused(true);
  }
}, []);
```

`resume` を修正:

```typescript
const resume = useCallback(() => {
  const ctx = audioContextRef.current;
  if (ctx && ctx.state === "suspended") {
    ctx.resume();
    setIsPlaying(true);
    setIsPaused(false);
  }
}, []);
```

`stop` を修正:

```typescript
const stop = useCallback(() => {
  stopAllNodes();
  setIsPlaying(false);
  setIsPaused(false);
  setCurrentSegment(0);
  setCurrentSegmentIndex(0);
}, [stopAllNodes, setCurrentSegmentIndex]);
```

return に `isPaused` を追加:

```typescript
return {
  load,
  playWithGaps,
  pause,
  resume,
  stop,
  seekToSegment,
  isPlaying,
  isPaused,
  currentSegment,
  isLoaded,
};
```

- [ ] **Step 5: App.tsx で isPaused を Player に渡す**

`src/App.tsx` の `<Player>` コンポーネントに `isPaused` propを追加:

```typescript
<Player
  isPlaying={player.isPlaying}
  isPaused={player.isPaused}
  isLoaded={player.isLoaded}
  hasSegments={segments.length > 0}
  onPlay={handlePlay}
  onPause={player.pause}
  onResume={player.resume}
  onStop={player.stop}
/>
```

- [ ] **Step 6: TypeScript型チェック**

Run: `npx tsc --noEmit 2>&1`
Expected: エラーなし

- [ ] **Step 7: Commit**

```bash
git add src/stores/appStore.ts src/hooks/useAudioPlayer.ts src/components/Player.tsx src/App.tsx
git commit -m "fix: sync player segment state with store and fix play/resume logic"
```

---

### Task 4: エクスポート後のステータスリセット修正

**Files:**
- Modify: `src/hooks/useSidecar.ts` (already updated in Task 2, verify)

エクスポート成功時にsidecarStatusが "processing" のまま残るのを修正する。
Task 2 の `useSidecar.ts` 書き換え時に、export success 時に `setSidecarStatus("ready")` を追加済み。
ここでは追加確認として、エクスポート失敗時もステータスをリセットする。

- [ ] **Step 1: 確認**

Task 2の `useSidecar.ts` のexport success部分に `setSidecarStatus("ready")` が含まれていることを確認。
error時も `setExporting(false)` を追加。

useSidecar.ts の error handler部分（Task 2で記述済み）に追加:

```typescript
if (response.status === "error") {
  setSidecarStatus("error");
  setExporting(false);
  setProcessingProgress(
    0,
    (response.payload.message as string) ?? "Unknown error",
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useSidecar.ts
git commit -m "fix: reset exporting state on sidecar error"
```

---

### Task 5: ビルド・動作確認

**Files:** なし（確認のみ）

- [ ] **Step 1: TypeScript型チェック**

Run: `npx tsc --noEmit 2>&1`
Expected: エラーなし

- [ ] **Step 2: Rustコンパイルチェック**

Run: `source "$HOME/.cargo/env" && cd src-tauri && cargo check 2>&1 | tail -5`
Expected: `Finished` with no errors

- [ ] **Step 3: Viteビルド確認**

Run: `npx vite build 2>&1 | tail -10`
Expected: ビルド成功

- [ ] **Step 4: 全変更をまとめてコミット（未コミットの変更がある場合）**

```bash
git status
# 未コミットの変更があれば
git add -A
git commit -m "chore: verify build passes after end-to-end flow fixes"
```
