import { Check, ChevronRight } from "lucide-react";
import { t } from "../../lib/i18n";
import type { WizardStep } from "../../lib/types";

const STEP_KEYS = ["import", "transcribe", "review", "configure", "export"] as const;

interface SidebarProps {
  current: WizardStep;
  onStep: (step: WizardStep) => void;
}

export function Sidebar({ current, onStep }: SidebarProps) {
  return (
    <aside className="flex w-64 flex-col gap-5 border-r border-paper-edge bg-paper-2 px-4 py-5">
      <div className="flex items-center gap-3 px-1">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-shiori-500 font-serif text-xl font-bold text-white shadow-warm-sm">
          R
        </div>
        <div>
          <div className="font-serif text-base font-semibold text-ink-900">
            {t.appTitle}
          </div>
          <div className="text-[10px] text-ink-500">{t.appTag}</div>
        </div>
      </div>

      <div className="px-1 font-serif text-[11px] italic tracking-wide text-ink-500">
        the workflow
      </div>

      <nav className="flex flex-col gap-1">
        {STEP_KEYS.map((key, i) => {
          const [label, sub] = t.steps[key];
          const isCurrent = i === current;
          const isDone = i < current;
          const clickable = isDone || isCurrent;
          return (
            <button
              key={key}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStep(i as WizardStep)}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${
                isCurrent ? "bg-shiori-100" : "hover:bg-paper-3/60"
              } ${clickable ? "cursor-pointer" : "cursor-default"}`}
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-semibold ${
                  isDone
                    ? "bg-hisui-500 text-white"
                    : isCurrent
                      ? "bg-shiori-500 text-white"
                      : "bg-paper-0 text-ink-500 border border-paper-edge"
                }`}
              >
                {isDone ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-ink-900">{label}</div>
                <div className="text-[11px] text-ink-500">{sub}</div>
              </div>
              {isCurrent && <ChevronRight className="h-3.5 w-3.5 text-shiori-500" />}
            </button>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="rounded-md border border-paper-edge bg-paper-0 p-3">
        <div className="mb-2 font-mono text-[9px] font-bold uppercase tracking-widest text-shiori-500">
          ☕ TIP
        </div>
        <div className="font-serif text-[11px] leading-relaxed text-ink-700">
          {t.tip}
        </div>
      </div>

      <div className="text-center font-serif text-[10px] italic text-ink-300">
        vol.1 · issue 03 · 2026
      </div>
    </aside>
  );
}
