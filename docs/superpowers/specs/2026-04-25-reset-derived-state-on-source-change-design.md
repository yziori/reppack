# 戻る → 新ファイル読込で自動解析が走らないバグの修正

## 背景 / 問題

ウィザード STEP 02 (`StepTranscribe`) の自動解析トリガーは、以下の useEffect で実現している:

```ts
// src/features/StepTranscribe/index.tsx:34-56
useEffect(() => {
  if (startedRef.current) return;
  if (!sourceFilePath) return;
  if (segments.length > 0) return;   // (A)
  startedRef.current = true;
  // ... requestTranscription(...) ...
}, [sourceFilePath, sourceLang, sidecarStatus, segments.length, ...]);
```

一方、`appStore` の `clearSourceFile` / `setSourceFile` は `sourceFilePath` / `sourceFileName` / `fileMeta` のみを更新し、解析の派生状態 (`segments`, `latestTranscript`, `processingProgress`, `processingMessage`, `transcribePhase`, `selectedSegmentId`) は前回ファイルのまま残る。

### 再現フロー

1. 音声 A をインポート → 解析実行 → `segments` 充填
2. STEP 02 で「戻る」を押下 → STEP 01 へ
3. A を「×」で削除 (`clearSourceFile`) し、音声 B をインポート (`setSourceFile`)
4. 「次へ」で STEP 02 へ
5. (A) の早期 return により `requestTranscription` が呼ばれず、自動解析が走らない
6. さらに、`isDone = segments.length > 0` が真のため「次へ」が活性化し、A の segments で先に進めてしまう

## 不変条件 (Invariant)

> **派生状態は現在の `sourceFilePath` に紐づく。`sourceFilePath` が変更/解除されたら、派生状態は必ず初期値に戻る。**

派生状態 (現ソースに紐づくもの):

- `segments`
- `latestTranscript`
- `processingProgress`
- `processingMessage`
- `transcribePhase`
- `selectedSegmentId`

派生でないもの (保持):

- `cfg` / `exportOptions` / `sourceLang` — ユーザー設定
- `sidecarStatus` — プロセス状態 (ファイルとは独立)
- `isExporting` / `exportProgress` / `exportedFilePath` — Export ステップの責務 (今回スコープ外)

## 設計

`src/stores/appStore.ts` の 2 アクションを修正する。

### `clearSourceFile`

現状:

```ts
clearSourceFile: () =>
  set({ sourceFilePath: null, sourceFileName: null, fileMeta: null }),
```

修正後:

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

### `setSourceFile`

現状:

```ts
setSourceFile: (path, name, meta) =>
  set({ sourceFilePath: path, sourceFileName: name, fileMeta: meta }),
```

修正後:

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

(初期値は `makeInitial()` の値と一致させる。)

## 副次効果 (意図通り)

- 新しい音声に切り替えた直後の STEP 02 で「次へ」が正しく無効化される (`isDone` が false に戻る)
- Sidebar から過去ステップ (Review/Configure/Export) に飛び、戻ってファイルを交換した場合も整合する
- `selectedSegmentId` が空 segments に紐づく不整合が消える

## テスト

`src/stores/appStore.test.ts` に 2 ケース追加:

1. **`clearSourceFile` が派生状態をリセットする**
   - 事前に `setSegments`, `setLatestTranscript`, `setProcessingProgress`, `selectSegment` で値を設定
   - `clearSourceFile()` 呼び出し後、6 つの派生フィールドがすべて初期値に戻ること
2. **`setSourceFile` の 2 回目呼び出しで前回派生状態がリセットされる**
   - 1 回目 `setSourceFile(...)` → `setSegments([...])` 等で値設定
   - 2 回目 `setSourceFile(...)` 後に派生フィールドが初期値に戻ること

## スコープ外

- 解析中のサイドカー要求のキャンセル (戻るを押したら `stopSidecar` を呼ぶ等)
- `sidecarStatus === "error"` のリセット
- StrictMode 下での二重起動対策
- Export 関連状態 (`isExporting` / `exportedFilePath`) のリセット

これらはそれぞれ別バグ/別タスクとして切り出す。
