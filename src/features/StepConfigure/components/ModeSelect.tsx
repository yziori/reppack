import type { PracticeMode } from "../../../lib/types";
import { t } from "../../../lib/i18n";

interface ModeSelectProps {
  value: PracticeMode;
  onChange: (v: PracticeMode) => void;
}

const MODES: { id: PracticeMode; label: string; desc: string; pattern: string[] }[] = [
  {
    id: "repeat",
    label: t.configure.modeRepeat,
    desc: t.configure.modeRepeatDesc,
    pattern: ["A", "P×N"],
  },
  {
    id: "overlap",
    label: t.configure.modeOverlap,
    desc: t.configure.modeOverlapDesc,
    pattern: ["A"],
  },
];

export function ModeSelect({ value, onChange }: ModeSelectProps) {
  return (
    <div>
      <div className="mb-2.5 text-xs font-mono uppercase tracking-wider text-ink-500">
        {t.configure.mode}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {MODES.map((m) => {
          const on = value === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(m.id)}
              className={`rounded-lg border p-4 text-left transition ${
                on
                  ? "border-shiori-500 bg-paper-0 ring-[3px] ring-shiori-100"
                  : "border-paper-edge bg-transparent"
              }`}
            >
              <div className="mb-1 font-serif text-base font-semibold text-ink-900">
                {m.label}
              </div>
              <div className="mb-3 font-mono text-[11px] leading-relaxed text-ink-500">
                {m.desc}
              </div>
              <div className="flex h-7 items-center gap-1">
                {m.pattern.map((p, i) => {
                  const isPause = p.startsWith("P");
                  return (
                    <div
                      key={i}
                      className={`${isPause ? "h-[3px]" : "h-4"} flex-1 rounded-[2px] ${
                        isPause
                          ? "bg-ink-300/50"
                          : on
                            ? "bg-shiori-500"
                            : "bg-ink-500"
                      }`}
                    />
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
