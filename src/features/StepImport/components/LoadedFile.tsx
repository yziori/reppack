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
        <div
          className="flex items-center justify-center rounded-md border border-hisui-500/30 bg-hisui-100 text-hisui-600"
          style={{ width: 52, height: 52 }}
        >
          <Music className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="truncate font-mono text-sm font-semibold text-ink-900">
            {name}
          </div>
          <div className="mt-0.5 font-mono text-xs text-ink-500">
            {fmtDuration(meta.durationSec)} · {fmtBytes(meta.sizeBytes)} ·{" "}
            {Math.round(meta.sampleRateHz / 1000)} kHz ·{" "}
            {meta.channels === 1 ? "mono" : "stereo"}
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
