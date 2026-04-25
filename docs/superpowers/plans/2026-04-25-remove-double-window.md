# 二重ウィンドウ解消 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tauri ネイティブウィンドウの中に自作 mac 風ウィンドウを描画している二重構造を撤廃し、内枠デザインを macOS の OS ウィンドウ自体に昇格させる。Win/Linux はベストエフォート（標準装飾 + setTitle）。

**Architecture:** `src/components/wizard/MacWindow.tsx` を削除し、新規 `TitleBar.tsx` を追加。`src/routes/index.tsx` で macOS のときのみ `<TitleBar>` を描画。`src-tauri/tauri.conf.json` に `titleBarStyle: "Overlay"` + `hiddenTitle: true` を追加して macOS のタイトルバー領域を透明化。全プラットフォーム共通で `getCurrentWindow().setTitle(...)` を呼び OS タイトルへ反映。

**Tech Stack:** Tauri v2、React 19、TypeScript、Tailwind v4、Vitest（既存のテスト基盤を活用）。

**Spec:** `docs/superpowers/specs/2026-04-25-remove-double-window-design.md`

**注: テスト方針** — UI レイアウト + Tauri 設定変更が中心のため、自動テストは新規 `TitleBar` の最低限のスモークテストに留め、その他は手動視覚確認 + `npx tsc --noEmit` で担保する。

---

## File Structure

| 種別 | パス | 役割 |
|------|------|------|
| 修正 | `src-tauri/tauri.conf.json` | macOS の `titleBarStyle: "Overlay"` + `hiddenTitle: true` を有効化 |
| 新規 | `src/components/wizard/TitleBar.tsx` | macOS の透明タイトル領域に乗せるカスタムタイトルバー |
| 新規 | `src/components/wizard/TitleBar.test.tsx` | TitleBar の最低限スモークテスト（タイトル表示 + drag region） |
| 修正 | `src/routes/index.tsx` | `<MacWindow>` 撤去、isMac判定で `<TitleBar>` 条件付き描画、`setTitle()` 連携 |
| 削除 | `src/components/wizard/MacWindow.tsx` | 役割は OS ウィンドウ + `<TitleBar>` に移譲済みのため不要 |

---

## Task 1: Tauri 設定で macOS の透明タイトルバーを有効化

**Files:**
- Modify: `src-tauri/tauri.conf.json`

- [ ] **Step 1: `app.windows[0]` に 2 行追加**

`src-tauri/tauri.conf.json` の `app.windows[0]` を以下のように編集する（既存の `title` / `width` / `height` は維持）:

```jsonc
"app": {
  "windows": [
    {
      "title": "reppack",
      "width": 800,
      "height": 600,
      "titleBarStyle": "Overlay",
      "hiddenTitle": true
    }
  ],
  "security": {
    "csp": null
  }
}
```

- `titleBarStyle: "Overlay"`: macOS のみ効果。透明タイトル領域を確保する。Win/Linux では無視されるので分岐不要。
- `hiddenTitle: true`: macOS の OS が描くタイトル文字を非表示にする。

- [ ] **Step 2: 設定の妥当性チェック（型ファイルが追従しているか）**

実行: `pnpm tauri dev` を別ターミナルで起動し、ウィンドウが立ち上がること、コンソールに `titleBarStyle` / `hiddenTitle` 関連のスキーマ警告が出ないことを確認。

期待動作:
- macOS なら、信号機が左上にあり、その右側のタイトル領域が**空白**（自前 TitleBar はまだ無いので何も描かれない）になる。
- 既存のセンタータイトル文字（OS 描画）が消えている。

確認できたら `pnpm tauri dev` は止めて次へ。

- [ ] **Step 3: コミット**

```bash
git add src-tauri/tauri.conf.json
git commit -m "feat(tauri): enable overlay titleBar and hidden OS title on macOS"
```

---

## Task 2: TitleBar コンポーネントを新規作成（テスト付き）

**Files:**
- Create: `src/components/wizard/TitleBar.tsx`
- Test: `src/components/wizard/TitleBar.test.tsx`

- [ ] **Step 1: 失敗するテストを書く**

`src/components/wizard/TitleBar.test.tsx` を以下の内容で作成:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TitleBar } from "./TitleBar";

describe("TitleBar", () => {
  it("renders the given title text", () => {
    render(<TitleBar title="reppack — sample.mp3" />);
    expect(screen.getByText("reppack — sample.mp3")).toBeTruthy();
  });

  it("root element has data-tauri-drag-region attribute", () => {
    const { container } = render(<TitleBar title="x" />);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute("data-tauri-drag-region")).not.toBeNull();
  });
});
```

- [ ] **Step 2: テストが import エラーで失敗することを確認**

実行: `pnpm test src/components/wizard/TitleBar.test.tsx`

期待: 「Cannot find module './TitleBar'」 系のエラーで FAIL。

- [ ] **Step 3: 最小実装を書く**

`src/components/wizard/TitleBar.tsx` を以下の内容で作成:

```tsx
interface TitleBarProps {
  title: string;
}

export function TitleBar({ title }: TitleBarProps) {
  return (
    <div
      data-tauri-drag-region
      className="flex h-7 shrink-0 items-center justify-center border-b border-paper-edge bg-paper-2 pl-20 pr-20"
    >
      <div className="text-xs font-mono text-ink-500">{title}</div>
    </div>
  );
}
```

ポイント:
- `h-7` (28px) は macOS 標準タイトルバー高さ。信号機と縦中央が揃う。
- `pl-20 pr-20` (80px) で左右対称。左側は信号機ぶん、右側は視覚バランスのため。実機目視で必要なら ±8px 内で調整可。
- `bg-paper-2 border-b border-paper-edge` は旧 `MacWindow` と同等のトーン。
- `data-tauri-drag-region` でルート全体をドラッグ可能化。
- `text-xs font-mono text-ink-500` は旧 `MacWindow` の中央テキストの再現。

- [ ] **Step 4: テストが通ることを確認**

実行: `pnpm test src/components/wizard/TitleBar.test.tsx`

期待: 2 件 PASS。

- [ ] **Step 5: コミット**

```bash
git add src/components/wizard/TitleBar.tsx src/components/wizard/TitleBar.test.tsx
git commit -m "feat(wizard): add TitleBar component for macOS overlay title bar"
```

---

## Task 3: index.tsx を改修（MacWindow 撤去 + TitleBar 条件付き + setTitle）

**Files:**
- Modify: `src/routes/index.tsx`

- [ ] **Step 1: `src/routes/index.tsx` を以下の内容に書き換える**

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAppStore } from "../stores/appStore";
import { TitleBar } from "../components/wizard/TitleBar";
import { Sidebar } from "../components/wizard/Sidebar";
import { StepImport } from "../features/StepImport";
import { StepTranscribe } from "../features/StepTranscribe";
import { StepReview } from "../features/StepReview";
import { StepConfigure } from "../features/StepConfigure";
import { StepExport } from "../features/StepExport";
import { t } from "../lib/i18n";
import type { WizardStep } from "../lib/types";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

const isMac =
  typeof navigator !== "undefined" &&
  /Mac/i.test(navigator.platform || navigator.userAgent);

function IndexPage() {
  const step = useAppStore((s) => s.step);
  const setStep = useAppStore((s) => s.setStep);
  const sourceFileName = useAppStore((s) => s.sourceFileName);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && step > 0) {
        setStep((step - 1) as WizardStep);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, setStep]);

  const title = `${t.appTitle}${sourceFileName ? ` — ${sourceFileName}` : ""}`;

  useEffect(() => {
    getCurrentWindow().setTitle(title).catch(() => {});
  }, [title]);

  const stepCmp = [
    <StepImport key={0} />,
    <StepTranscribe key={1} />,
    <StepReview key={2} />,
    <StepConfigure key={3} />,
    <StepExport key={4} />,
  ][step];

  return (
    <>
      {isMac && <TitleBar title={title} />}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar current={step} onStep={setStep} />
        {stepCmp}
      </div>
    </>
  );
}
```

主な変更点:
- 外側 `<div className="h-full p-6">` ラッパを撤去。
- `<MacWindow>` インポート + 使用を撤去し、代わりに `<TitleBar>` を `isMac` 条件付きで描画。
- 新規 `useEffect` で `getCurrentWindow().setTitle(title)` を呼ぶ。失敗は `.catch(() => {})` で握り潰す（dev 環境保護）。
- `isMac` はモジュールスコープで一度だけ評価（実行中に OS は変わらない）。

- [ ] **Step 2: 型チェック**

実行: `npx tsc --noEmit`

期待: エラーなし。`MacWindow` のインポートが残っていないこと、`TitleBar` のインポートが正しいことが確認される。

- [ ] **Step 3: 既存テストが壊れていないことを確認**

実行: `pnpm test`

期待: 既存の `appStore.test.ts` + 新規 `TitleBar.test.tsx` が全 PASS。

- [ ] **Step 4: 起動して目視確認（macOS）**

実行: `pnpm tauri dev`

確認:
- ウィンドウ左上に信号機 ● ● ● が表示されている。
- その右側に `<TitleBar>`（paper-2 帯 + 中央に `reppack` 文字）が表示されている。
- ウィンドウが旧 `MacWindow` の角丸＋影＋自作信号機を持っていない（フラットに OS ウィンドウへ収まっている）。
- TitleBar 領域でウィンドウをドラッグ移動できる。

ファイル import 後（Step1 の Import を実行した後）:
- TitleBar の中央テキストと、Cmd+Tab / Mission Control の OS タイトル両方が `reppack — <ファイル名>` に更新されている。
- OS が描くセンタータイトル文字が二重表示になっていない。

確認できたら `pnpm tauri dev` を止めて次へ。

- [ ] **Step 5: コミット**

```bash
git add src/routes/index.tsx
git commit -m "feat(routes): drop MacWindow chrome, mount TitleBar on macOS, sync OS title"
```

---

## Task 4: 旧 MacWindow.tsx を削除

**Files:**
- Delete: `src/components/wizard/MacWindow.tsx`

- [ ] **Step 1: 残参照がないことを確認**

実行: `grep -rn "MacWindow" src/`

期待: マッチなし（Task 3 の改修でインポートも撤去済み）。

もしマッチがあったら、Task 3 が不完全。先に修正してから次へ。

- [ ] **Step 2: ファイルを削除**

実行: `git rm src/components/wizard/MacWindow.tsx`

- [ ] **Step 3: 型チェックとテスト再実行**

実行: `npx tsc --noEmit && pnpm test`

期待: いずれもエラー / 失敗なし。

- [ ] **Step 4: コミット**

```bash
git commit -m "chore(wizard): remove obsolete MacWindow component"
```

---

## Task 5: 最終手動検証

**Files:** なし（変更なし、確認のみ）

- [ ] **Step 1: macOS 検証チェックリスト**

実行: `pnpm tauri dev`

以下を順に確認（チェック項目はすべて spec の「検証計画」より）:

1. ウィンドウ左上に信号機（赤・黄・緑）が表示されている。
2. その右側にカスタム `<TitleBar>`（paper-2 帯 + 中央に `reppack — ファイル名`）が表示されている。
3. `<TitleBar>` の領域でウィンドウをドラッグ移動できる。
4. ファイルを Import すると、`<TitleBar>` 中央のテキストと、Cmd+Tab / Mission Control の OS タイトル両方が `reppack — <ファイル名>` に更新される。
5. OS が描くセンタータイトル文字が `<TitleBar>` のテキストと二重表示になっていない（`hiddenTitle: true` の効果確認）。
6. 二重ウィンドウ枠（旧 `MacWindow` の角丸 + 影 + 信号機自作）が完全に消えている。
7. Sidebar / Step1〜5 の中身が壊れていない（既存機能のリグレッションなし）。

すべて OK ならアプリを止めて次へ。問題があれば、該当 Task に戻って修正 → 再検証。

- [ ] **Step 2: 型 / ビルド最終確認**

実行: `npx tsc --noEmit`

期待: エラーなし。

実行: `pnpm test`

期待: 全テスト PASS。

- [ ] **Step 3: 完了報告（コミット不要）**

すべてのチェックが通れば実装完了。Win/Linux 環境がある場合のみ追加検証（標準装飾 + setTitle 反映 + 破綻なし）を行うが、必須ではない。

---

## Self-Review

実装計画を spec と突き合わせて確認した結果:

**1. Spec coverage:**
- Spec「全体構造 / macOS」→ Task 1 (config) + Task 2 (TitleBar) + Task 3 (条件付き描画)
- Spec「全体構造 / Win+Linux」→ Task 3 の `isMac` 判定で TitleBar を描かないことで対応、`setTitle()` は全 OS で実行
- Spec「変更対象ファイル / 削除」→ Task 4
- Spec「変更対象ファイル / 新規」→ Task 2
- Spec「変更対象ファイル / 修正」→ Task 1, Task 3
- Spec「Tauri 設定」→ Task 1
- Spec「setTitle 連携」→ Task 3 Step 1
- Spec「検証計画」→ Task 3 Step 4 + Task 5

すべて対応済み。

**2. Placeholder scan:** TBD/TODO/「適切なエラーハンドリング」等のあいまい指示なし。各 step に具体的なコード or コマンドを記載。

**3. Type consistency:** `TitleBar` の Props は `{ title: string }` で Task 2 と Task 3 で一致。`isMac` の宣言箇所と参照箇所が一致。`getCurrentWindow().setTitle(title)` のシグネチャは `@tauri-apps/api` v2 と一致。

問題なし。
