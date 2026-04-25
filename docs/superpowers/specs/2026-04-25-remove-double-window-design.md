# 二重ウィンドウ解消 — 内枠デザインのOSウィンドウ昇格

- **作成日**: 2026-04-25
- **対象**: reppack デスクトップアプリ (Tauri v2 + React)
- **一次ターゲットOS**: macOS
- **ステータス**: 設計合意済み（実装計画はこのドキュメント承認後に作成）

## 背景と問題

現状、`src/routes/index.tsx` は以下の三層構造になっている。

1. OS のネイティブウィンドウ（Tauri 標準装飾、信号機・タイトルバー付き）
2. `bg-paper-1` の全画面 + `p-6` パディング（壁紙的余白）
3. 自前の `<MacWindow>` コンポーネント — 赤/黄/緑の信号機ボタン付き mac 風ウィンドウ枠を再描画

結果として **「OS ウィンドウの中にもう一つ mac 風ウィンドウが入っている」** 二重構造となり、デスクトップ的メタファが冗長になっている。

## ゴール

- 二重ウィンドウ感を解消する。
- 現 `<MacWindow>` のセリフ体タイトル + paper-2 帯 + 中央寄せタイトル文字といった意匠は、捨てるのではなく **OS ウィンドウのタイトルバー領域に昇格** させる（macOS のみ）。
- Windows / Linux はベストエフォート。OS 標準装飾 + `setTitle()` だけ正しく反映できれば良しとする。

## ノンゴール

- Windows / Linux 向けの専用カスタム装飾の自作。
- 雑誌風意匠（"vol.1 · issue 03 · 2026"、TIPカード、"the workflow" などサイドバー内の装飾）の見直し。
- 配色 (`paper-1` / `paper-2`) の整理・統一。
- ウィンドウ最小サイズの設定。

## 全体構造

### macOS（一次ターゲット）

```
┌─ Tauri OS Window (titleBarStyle: Overlay, hiddenTitle: true) ─────────┐
│ ● ● ●        TitleBar (paper-2, drag-region, "reppack — sample.mp3") │
├──────────────┬─────────────────────────────────────────────────────────┤
│  Sidebar     │  Content (CanvasShell)                                 │
│  (paper-2)   │  (paper-1)                                             │
└──────────────┴─────────────────────────────────────────────────────────┘
```

- 信号機 = OS が描く本物。
- タイトルバー帯は `titleBarStyle: "Overlay"` により透明化され、その上に自作 `<TitleBar>` が乗る。
- `<TitleBar>` 自身に `data-tauri-drag-region` を付け、領域全体をドラッグ可能にする。

### Windows / Linux（ベストエフォート）

```
┌─ Tauri OS Window (標準装飾, タイトル "reppack — sample.mp3") ────────┐
├──────────────┬─────────────────────────────────────────────────────────┤
│  Sidebar     │  Content                                               │
└──────────────┴─────────────────────────────────────────────────────────┘
```

- カスタム `<TitleBar>` は描画しない。
- OS 標準のタイトルバー + 標準ボタンが使われる。
- タイトル文字は `setTitle()` で OS ウィンドウタイトルへ反映。

## 変更対象ファイル

### 削除

- `src/components/wizard/MacWindow.tsx` — ファイルごと削除。役割は OS ウィンドウ + 新 `<TitleBar>` に分解。

### 新規追加

- `src/components/wizard/TitleBar.tsx`
  - Props: `title: string`
  - 高さ: `h-7` (28px) — macOS 標準タイトルバー高さに合わせ、信号機と縦中央が揃うようにする。
  - 背景: `bg-paper-2`、下に `border-b border-paper-edge`。
  - レイアウト: `flex items-center justify-center`、左右の信号機ぶん対称パディングとして `pl-20 pr-20` (80px)。実機で目視調整可（許容誤差 ±8px）。
  - タイトル文字: 現 `MacWindow` のスタイル `text-xs font-mono text-ink-500` を踏襲。
  - ルート要素に `data-tauri-drag-region`。インタラクティブ要素を追加する場合は `data-tauri-drag-region={false}` で除外する規約とする（現状静的テキストのみ）。

### 修正

- `src/routes/index.tsx`
  - 外側 `<div className="h-full p-6">` を撤去。
  - `<MacWindow title={...}>{...}</MacWindow>` ラッパを撤去。
  - 代わりに以下の構造へ:
    ```tsx
    <>
      {isMac && <TitleBar title={title} />}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar current={step} onStep={setStep} />
        {stepCmp}
      </div>
    </>
    ```
  - `useEffect` で `getCurrentWindow().setTitle(title)` を呼ぶ（タイトル更新ごと）。失敗時は `.catch(() => {})` で握り潰す（dev / ブラウザモード安全策）。
  - `isMac` 判定: ファイル冒頭で `const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform || navigator.userAgent);`

### 修正なし（影響を受けない）

- `src/routes/__root.tsx` — `bg-paper-1` の全画面ラッパは Content 背景として継続利用。
- `Sidebar.tsx`, `CanvasShell.tsx`, `NavFoot.tsx`, 各 `StepXxx` 機能。
- 雑誌風意匠（ロゴ / "the workflow" / TIP カード / "vol.1 · issue 03 · 2026"）。
- `paper-1` / `paper-2` の段差感。

## Tauri 設定の変更

`src-tauri/tauri.conf.json` の `app.windows[0]` に以下を追記:

```jsonc
{
  "title": "reppack",
  "width": 800,
  "height": 600,
  "titleBarStyle": "Overlay",
  "hiddenTitle": true
}
```

- `titleBarStyle: "Overlay"`: macOS のみ効果。透明タイトル領域を確保し、自作描画を許可する。Win/Linux では無視される。
- `hiddenTitle: true`: macOS の OS 描画タイトル文字を非表示。自作 `<TitleBar>` との二重表示を防ぐ。

## setTitle 連携

`src/routes/index.tsx` に以下を追加:

```tsx
import { getCurrentWindow } from "@tauri-apps/api/window";

useEffect(() => {
  getCurrentWindow().setTitle(title).catch(() => {});
}, [title]);
```

- 既存の Escape キーハンドラの `useEffect` と並べる。
- 全プラットフォーム共通で実行（Cmd+Tab / タスクバー / スクリーンショットメタデータのため）。

## 依存関係

- `@tauri-apps/api` の `window.getCurrentWindow().setTitle()` を利用。Tauri v2 アプリなので既存依存に含まれているはず（実装前に `pnpm list` で確認）。
- `@tauri-apps/plugin-os` は導入しない（`navigator` 簡易判定で十分）。

## 検証計画

### macOS

1. `pnpm tauri dev` で起動。
2. ウィンドウ左上に信号機（赤・黄・緑）が表示される。
3. その右側にカスタム `<TitleBar>`（paper-2 帯 + 中央に `reppack — ファイル名`）が表示される。
4. `<TitleBar>` の領域でウィンドウをドラッグ移動できる。
5. ファイルを Import すると、`<TitleBar>` 中央のテキストと、Cmd+Tab / Mission Control に表示される OS ウィンドウタイトル両方が `reppack — <ファイル名>` に更新される。
6. OS が描くセンタータイトル文字が `<TitleBar>` のテキストと二重表示になっていない（`hiddenTitle: true` の効果確認）。
7. 二重ウィンドウ枠（旧 `MacWindow` の角丸 + 影 + 信号機自作）が完全に消えている。

### Windows / Linux（手元環境がある場合のみ）

1. OS 標準のタイトルバーが表示され、タイトルが `reppack — <ファイル名>` に更新される。
2. カスタム `<TitleBar>` は描画されていない。
3. ウィンドウは破綻なく表示・操作可能。

### 型・ビルド

- `npx tsc --noEmit` でエラーなし。
- `pnpm tauri dev` で起動失敗なし。

## ロールバック容易性

- 変更は局所的（`MacWindow.tsx` 削除 / `index.tsx` 編集 / `tauri.conf.json` 2 行追加 / `TitleBar.tsx` 新規）。
- 問題があった場合は `git revert` で完全に元に戻せる。
