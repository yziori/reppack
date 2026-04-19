interface PhaseProgressProps {
  phase: 0 | 1;
  percent: number;
  processedSec: number;
  totalSec: number;
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function PhaseProgress({ phase, percent, processedSec, totalSec }: PhaseProgressProps) {
  const remainSec = Math.max(1, Math.round(((100 - percent) / 100) * totalSec * 0.8));
  return (
    <div className="rounded-xl border border-paper-edge bg-paper-0 p-7 shadow-warm-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="font-mono text-[11px] tracking-widest text-ink-500">
          {phase === 0 ? "PHASE 1 / 2" : "PHASE 2 / 2"}
        </div>
        <div className="flex-1 h-px bg-paper-edge" />
      </div>
      <div className="mb-5 font-serif text-xl font-semibold text-ink-900">
        {phase === 0 ? "無音区間の検出" : "文字起こし"}
      </div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-paper-3">
        <div
          className="h-full rounded-full bg-shiori-500 transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex justify-between font-mono text-xs text-ink-700">
        <span>{Math.round(percent)}%</span>
        <span>
          処理済み <strong className="text-ink-900">{fmt(processedSec)}</strong> / {fmt(totalSec)}
        </span>
        <span>
          {percent < 100 ? (
            <>
              残り時間: <strong className="text-ink-900">~{remainSec}s</strong>
            </>
          ) : (
            <strong className="text-ok">完了</strong>
          )}
        </span>
      </div>
    </div>
  );
}
