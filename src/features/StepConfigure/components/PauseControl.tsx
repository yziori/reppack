import { Segmented } from "../../../components/Segmented";
import { Slider } from "../../../components/Slider";
import { t } from "../../../lib/i18n";
import type { Cfg } from "../../../lib/types";

interface PauseControlProps {
  cfg: Cfg;
  onChange: (patch: Partial<Cfg>) => void;
}

export function PauseControl({ cfg, onChange }: PauseControlProps) {
  return (
    <div className="rounded-lg border border-paper-edge bg-paper-0 p-5">
      <div className="mb-3 flex items-center">
        <div className="flex-1 font-serif text-sm font-semibold text-ink-900">
          {t.configure.pause}
        </div>
        <Segmented
          value={cfg.pauseKind}
          onChange={(v) => onChange({ pauseKind: v })}
          options={[
            { value: "preset", label: t.configure.pausePreset },
            { value: "ratio", label: t.configure.pauseRatio },
          ]}
        />
      </div>

      {cfg.pauseKind === "preset" ? (
        <div className="flex flex-wrap gap-2">
          {[1.0, 1.5, 2.0, 3.0].map((v) => {
            const on = cfg.pausePreset === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => onChange({ pausePreset: v })}
                className={`rounded-md border px-4 py-2.5 font-mono text-sm transition-colors ${
                  on
                    ? "border-shiori-500 bg-shiori-500 text-white"
                    : "border-paper-edge bg-paper-0 text-ink-900"
                }`}
              >
                {v.toFixed(1)}s
              </button>
            );
          })}
        </div>
      ) : (
        <Slider
          value={cfg.pauseRatio}
          min={0.5}
          max={3}
          onChange={(v) => onChange({ pauseRatio: v })}
          formatValue={(v) => `×${v.toFixed(1)} セグメント長`}
        />
      )}
    </div>
  );
}
