# 戻る → 新ファイル読込で自動解析が走らないバグの修正 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `clearSourceFile` / `setSourceFile` を呼んだ際に派生状態 (segments など) が自動でリセットされるようにし、戻る→新音声読込で自動解析が必ず走るようにする。

**Architecture:** `appStore` の 2 アクション (`clearSourceFile`, `setSourceFile`) に派生状態の初期化を統合する。派生状態 = `segments`, `latestTranscript`, `processingProgress`, `processingMessage`, `transcribePhase`, `selectedSegmentId`。`cfg` / `exportOptions` / `sourceLang` / `sidecarStatus` は対象外 (ユーザー設定/プロセス状態)。

**Tech Stack:** Zustand v5, Vitest, TypeScript

**Spec:** [`docs/superpowers/specs/2026-04-25-reset-derived-state-on-source-change-design.md`](../specs/2026-04-25-reset-derived-state-on-source-change-design.md)

---

## File Structure

| File | 種別 | 責務 |
|---|---|---|
| `src/stores/appStore.ts` | Modify | `clearSourceFile` / `setSourceFile` に派生状態リセットを追加 |
| `src/stores/appStore.test.ts` | Modify | リセット挙動のテスト 2 件追加 |

両ファイルは責務が直接対応しており、まとめて変更する。

---

## Task 1: `clearSourceFile` で派生状態がリセットされるテスト

**Files:**
- Modify: `src/stores/appStore.test.ts` (新しい `describe("source file reset")` ブロックを追加)

- [ ] **Step 1: 失敗するテストを追加**

`src/stores/appStore.test.ts` の最後 (`describe("reset", ...)` の後、`describe("appStore", ...)` の閉じ括弧の前) に以下の `describe` ブロックを追加:

```ts
  describe("source file reset", () => {
    it("clearSourceFile resets derived state", () => {
      const s = useAppStore.getState();
      s.setSourceFile("/tmp/a.mp3", "a.mp3", {
        durationSec: 60,
        sizeBytes: 1024,
        sampleRateHz: 44100,
        channels: 2,
      });
      s.setSegments([{ id: 1, start: 0, end: 1, text: "hi" }]);
      s.setLatestTranscript("hi");
      s.setProcessingProgress(50, "halfway", 1);
      s.selectSegment(1);

      s.clearSourceFile();

      const state = useAppStore.getState();
      expect(state.sourceFilePath).toBeNull();
      expect(state.sourceFileName).toBeNull();
      expect(state.fileMeta).toBeNull();
      expect(state.segments).toEqual([]);
      expect(state.latestTranscript).toBe("");
      expect(state.processingProgress).toBe(0);
      expect(state.processingMessage).toBe("");
      expect(state.transcribePhase).toBe(0);
      expect(state.selectedSegmentId).toBeNull();
    });
  });
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run:
```bash
pnpm test -- src/stores/appStore.test.ts -t "clearSourceFile resets derived state"
```

Expected: FAIL — `state.segments` が空でない (前のテスト相当の値が残る) など、いくつかの `expect` が失敗する。

- [ ] **Step 3: コミット (失敗テストとして)**

```bash
git add src/stores/appStore.test.ts
git commit -m "test(appStore): add failing test for clearSourceFile derived state reset"
```

---

## Task 2: `clearSourceFile` 実装の修正

**Files:**
- Modify: `src/stores/appStore.ts:102-103`

- [ ] **Step 1: `clearSourceFile` を派生状態もリセットする実装に変更**

`src/stores/appStore.ts` の以下:

```ts
  clearSourceFile: () =>
    set({ sourceFilePath: null, sourceFileName: null, fileMeta: null }),
```

を、次のように置換:

```ts
  clearSourceFile: () =>
    set({
      sourceFilePath: null,
      sourceFileName: null,
      fileMeta: null,
      segments: [],
      latestTranscript: "",
      processingProgress: 0,
      processingMessage: "",
      transcribePhase: 0,
      selectedSegmentId: null,
    }),
```

- [ ] **Step 2: テストを実行して合格を確認**

Run:
```bash
pnpm test -- src/stores/appStore.test.ts -t "clearSourceFile resets derived state"
```

Expected: PASS

- [ ] **Step 3: 既存テストの全件回帰を確認**

Run:
```bash
pnpm test -- src/stores/appStore.test.ts
```

Expected: 既存 6 件 + 新 1 件 = 7 件すべて PASS。

- [ ] **Step 4: コミット**

```bash
git add src/stores/appStore.ts
git commit -m "fix(appStore): reset derived state in clearSourceFile"
```

---

## Task 3: `setSourceFile` で派生状態がリセットされるテスト

**Files:**
- Modify: `src/stores/appStore.test.ts` (Task 1 で追加した `describe("source file reset")` 内に追加)

- [ ] **Step 1: 失敗するテストを追加**

Task 1 で追加した `describe("source file reset", () => { ... })` の中、`it("clearSourceFile resets derived state", ...)` の直後に以下を追加:

```ts
    it("setSourceFile resets derived state from previous source", () => {
      const s = useAppStore.getState();
      s.setSourceFile("/tmp/a.mp3", "a.mp3", {
        durationSec: 60,
        sizeBytes: 1024,
        sampleRateHz: 44100,
        channels: 2,
      });
      s.setSegments([{ id: 1, start: 0, end: 1, text: "hi" }]);
      s.setLatestTranscript("hi");
      s.setProcessingProgress(50, "halfway", 1);
      s.selectSegment(1);

      s.setSourceFile("/tmp/b.mp3", "b.mp3", {
        durationSec: 30,
        sizeBytes: 512,
        sampleRateHz: 48000,
        channels: 1,
      });

      const state = useAppStore.getState();
      expect(state.sourceFilePath).toBe("/tmp/b.mp3");
      expect(state.sourceFileName).toBe("b.mp3");
      expect(state.fileMeta?.durationSec).toBe(30);
      expect(state.segments).toEqual([]);
      expect(state.latestTranscript).toBe("");
      expect(state.processingProgress).toBe(0);
      expect(state.processingMessage).toBe("");
      expect(state.transcribePhase).toBe(0);
      expect(state.selectedSegmentId).toBeNull();
    });
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run:
```bash
pnpm test -- src/stores/appStore.test.ts -t "setSourceFile resets derived state from previous source"
```

Expected: FAIL — `state.segments` 等が前回の値のまま残るため失敗する。

- [ ] **Step 3: コミット (失敗テストとして)**

```bash
git add src/stores/appStore.test.ts
git commit -m "test(appStore): add failing test for setSourceFile derived state reset"
```

---

## Task 4: `setSourceFile` 実装の修正

**Files:**
- Modify: `src/stores/appStore.ts:99-100` (Task 2 適用後の同じ位置)

- [ ] **Step 1: `setSourceFile` を派生状態もリセットする実装に変更**

`src/stores/appStore.ts` の以下:

```ts
  setSourceFile: (path, name, meta) =>
    set({ sourceFilePath: path, sourceFileName: name, fileMeta: meta }),
```

を、次のように置換:

```ts
  setSourceFile: (path, name, meta) =>
    set({
      sourceFilePath: path,
      sourceFileName: name,
      fileMeta: meta,
      segments: [],
      latestTranscript: "",
      processingProgress: 0,
      processingMessage: "",
      transcribePhase: 0,
      selectedSegmentId: null,
    }),
```

- [ ] **Step 2: テストを実行して合格を確認**

Run:
```bash
pnpm test -- src/stores/appStore.test.ts -t "setSourceFile resets derived state from previous source"
```

Expected: PASS

- [ ] **Step 3: 既存テストの全件回帰を確認**

Run:
```bash
pnpm test -- src/stores/appStore.test.ts
```

Expected: 既存 6 件 + 新 2 件 = 8 件すべて PASS。

- [ ] **Step 4: 型チェック**

Run:
```bash
npx tsc --noEmit
```

Expected: エラー 0 件。

- [ ] **Step 5: 全テスト走査 (リグレッションがないことを確認)**

Run:
```bash
pnpm test
```

Expected: すべて PASS。

- [ ] **Step 6: コミット**

```bash
git add src/stores/appStore.ts
git commit -m "fix(appStore): reset derived state in setSourceFile"
```

---

## Task 5: 手動 E2E 検証 (バグ再現フローの解消確認)

**Files:** なし (UI 動作確認)

- [ ] **Step 1: 開発サーバー起動**

Run:
```bash
pnpm tauri dev
```

Expected: ウィザードのウィンドウが立ち上がる。

- [ ] **Step 2: バグ再現フローを実行**

1. 音声 A (例: `public/sample.pack.mp3` でも別音声でも可) をインポート
2. 「次へ」で STEP 02 へ → 自動解析が走り完了することを確認
3. STEP 02 で「戻る」を押して STEP 01 へ
4. ロード済みファイルの「×」で削除
5. 別の音声 B を新規インポート
6. 「次へ」で STEP 02 へ

Expected:
- STEP 02 に入った直後、進捗 0% から自動解析が再度走り出す
- 「次へ」ボタンは解析完了 (segments 充填) まで無効
- 解析完了後、B の transcript が表示される (A のものではない)

- [ ] **Step 3: 同じフローを「削除せず別ファイルを setSourceFile」する経路でも確認 (可能なら)**

LoadedFile 表示中に再度ファイル選択 UI から別ファイルを選んでもこのフローが踏める場合は試す。 (現状の UI では「×」削除→DropZone→新規選択の経路しかなければスキップ可。)

Expected: 同様にリセット → 自動解析。

---

## 完了条件

- [ ] Task 1〜4 すべての自動テストが PASS
- [ ] `npx tsc --noEmit` がエラー 0
- [ ] Task 5 の手動 E2E でバグが解消されている
- [ ] commit が 4 本 (test failing × 2, fix × 2) として残る

---

## Self-Review

**Spec coverage:**
- 不変条件 (派生状態は sourceFilePath に紐づく) → Task 2, 4 で `clearSourceFile` / `setSourceFile` 双方をカバー
- リセット対象 6 フィールド (segments / latestTranscript / processingProgress / processingMessage / transcribePhase / selectedSegmentId) → Task 1, 3 のテストで全フィールドを assert、Task 2, 4 の実装で全フィールドをセット
- 非対象 (cfg / exportOptions / sourceLang / sidecarStatus / Export 関連) → 実装でも触れず、テストでも assert しない (検証スコープ外)
- テスト 2 件 (clearSourceFile / setSourceFile 2 回呼び) → Task 1, 3 で実装

**Placeholder scan:** TBD/TODO/省略なし。各ステップにコードまたはコマンドの実体あり。

**Type consistency:** `setSourceFile(path, name, meta)` のシグネチャ、`FileMeta` の各フィールド (`durationSec`, `sizeBytes`, `sampleRateHz`, `channels`)、`setProcessingProgress(progress, message, phase)` の引数順 — すべて `appStore.ts` および `lib/types.ts` の定義と一致。
