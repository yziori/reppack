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

export function ExportOptionsPanel({
  options,
  onChange,
  onPickDir,
}: ExportOptionsProps) {
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
              <option key={v} value={v}>
                {v} kbps
              </option>
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
