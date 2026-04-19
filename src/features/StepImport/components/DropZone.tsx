import { Folder, Upload } from "lucide-react";
import { Button } from "../../../components/Button";
import { t } from "../../../lib/i18n";

interface DropZoneProps {
  hover: boolean;
  onHoverChange: (hover: boolean) => void;
  onPickFile: () => void;
  error: "format" | "corrupt" | null;
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
          <div className="max-w-[380px] font-serif text-sm italic text-ink-500 mx-auto">
            {error === "format" ? t.errors.fileFormatBody : t.errors.fileCorruptBody}
          </div>
          <Button
            variant="primary"
            onClick={(e) => {
              e.stopPropagation();
              onPickFile();
            }}
          >
            <Folder className="h-3.5 w-3.5" /> 別のファイルを選ぶ
          </Button>
        </div>
      ) : (
        <>
          <div
            className={`mb-5 flex items-center justify-center rounded-full border border-dashed border-shiori-500/40 bg-shiori-100/40 text-shiori-500 transition-transform ${
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
          <Button
            variant="primary"
            onClick={(e) => {
              e.stopPropagation();
              onPickFile();
            }}
          >
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
