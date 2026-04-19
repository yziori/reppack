import { Minus, Plus } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import {
  CanvasShell,
  DisplayHeading,
  Eyebrow,
  Lede,
  PageMarker,
} from "../../components/wizard/CanvasShell";
import { NavFoot } from "../../components/wizard/NavFoot";
import { Button } from "../../components/Button";
import { t } from "../../lib/i18n";
import { ModeSelect } from "./components/ModeSelect";
import { PauseControl } from "./components/PauseControl";
import { SummaryCard } from "./components/SummaryCard";

export function StepConfigure() {
  const cfg = useAppStore((s) => s.cfg);
  const segments = useAppStore((s) => s.segments);
  const setCfg = useAppStore((s) => s.setCfg);
  const setStep = useAppStore((s) => s.setStep);

  const isOverlap = cfg.mode === "overlap";

  return (
    <CanvasShell
      head={
        <div>
          <Eyebrow>STEP 04 · CONFIGURE</Eyebrow>
          <DisplayHeading>{t.configure.h}</DisplayHeading>
          <Lede>{t.configure.sub}</Lede>
        </div>
      }
      right={<PageMarker num={4} total={5} />}
      foot={<NavFoot onBack={() => setStep(2)} onNext={() => setStep(4)} />}
    >
      <div className="grid grid-cols-[1.5fr_1fr] gap-6">
        <div className="flex flex-col gap-5">
          <ModeSelect value={cfg.mode} onChange={(v) => setCfg({ mode: v })} />
          {!isOverlap && <PauseControl cfg={cfg} onChange={setCfg} />}

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-paper-edge bg-paper-0 p-4">
              <div className="mb-2.5 font-serif text-sm font-semibold">
                {t.configure.speed}
              </div>
              <div className="flex gap-1.5">
                {[0.75, 1.0, 1.25, 1.5].map((v) => {
                  const on = cfg.speed === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setCfg({ speed: v })}
                      className={`flex-1 min-w-[38px] rounded border py-2 font-mono text-xs transition-colors ${
                        on
                          ? "border-shiori-500 bg-shiori-500 text-white"
                          : "border-paper-edge bg-paper-0 text-ink-900"
                      }`}
                    >
                      ×{v}
                    </button>
                  );
                })}
              </div>
            </div>

            {!isOverlap && (
              <div className="rounded-lg border border-paper-edge bg-paper-0 p-4">
                <div className="mb-2.5 font-serif text-sm font-semibold">
                  {t.configure.repeats}
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="icon"
                    onClick={() => setCfg({ repeats: Math.max(1, cfg.repeats - 1) })}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <div className="flex-1 text-center font-serif text-3xl font-semibold">
                    {cfg.repeats}
                  </div>
                  <Button
                    variant="icon"
                    onClick={() => setCfg({ repeats: Math.min(10, cfg.repeats + 1) })}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="mt-1 text-center font-mono text-[11px] text-ink-500">
                  × per segment
                </div>
              </div>
            )}
          </div>
        </div>

        <SummaryCard cfg={cfg} segments={segments} />
      </div>
    </CanvasShell>
  );
}
