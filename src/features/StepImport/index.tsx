import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useAppStore } from "../../stores/appStore";
import { importAudio } from "../../lib/tauriCommands";
import {
  CanvasShell,
  DisplayHeading,
  Eyebrow,
  Lede,
  PageMarker,
} from "../../components/wizard/CanvasShell";
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
        filters: [
          {
            name: "Audio",
            extensions: ["mp3", "m4a", "wav", "flac", "ogg", "opus"],
          },
        ],
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
