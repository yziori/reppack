import { t } from "../../../lib/i18n";
import type { Cfg, Segment } from "../../../lib/types";

interface SummaryCardProps {
  cfg: Cfg;
  segments: Segment[];
}

function estimate(cfg: Cfg, segments: Segment[]) {
  const segCount = segments.length;
  const audioTotal = segments.reduce((a, s) => a + (s.end - s.start), 0);
  const avgSegLen = segCount > 0 ? audioTotal / segCount : 0;
  const isOverlap = cfg.mode === "overlap";
  const pauseLen = isOverlap
    ? 0
    : cfg.pauseKind === "preset"
      ? cfg.pausePreset
      : cfg.pauseRatio * avgSegLen;
  const repeats = isOverlap ? 1 : cfg.repeats;
  const perSeg = avgSegLen + pauseLen * repeats;
  const totalSec = cfg.speed > 0 ? (perSeg * segCount) / cfg.speed : 0;
  const mb = (totalSec * 0.016).toFixed(1);
  return { totalSec, segCount, mb };
}

export function SummaryCard({ cfg, segments }: SummaryCardProps) {
  const { totalSec, segCount, mb } = estimate(cfg, segments);
  const mins = Math.floor(totalSec / 60);
  const secs = Math.round(totalSec % 60);

  return (
    <div className="relative overflow-hidden rounded-xl border border-paper-edge bg-paper-2 p-6">
      {/* bookmark ribbon (栞) */}
      <div
        className="absolute right-5 -top-1 bg-shiori-500 shadow-warm-sm"
        style={{
          height: 60,
          width: 28,
          clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)",
        }}
      />
      <div className="mb-4 font-serif text-lg font-semibold text-ink-900">
        {t.configure.summary}
      </div>
      <div className="flex flex-col gap-3">
        <Row
          label={t.configure.summaryDur}
          value={`${mins}:${String(secs).padStart(2, "0")}`}
          big
        />
        <Row label={t.configure.summarySegs} value={`${segCount}`} />
        <Row label={t.configure.summarySize} value={`~ ${mb} MB`} />
      </div>
      <div className="mt-4 border-t border-dashed border-paper-edge pt-3">
        <div className="mb-2 text-xs font-mono uppercase tracking-wider text-ink-500">
          パターン
        </div>
        <PatternPreview cfg={cfg} />
      </div>
    </div>
  );
}

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs text-ink-500">{label}</span>
      <span
        className={
          big
            ? "font-serif text-3xl font-semibold text-ink-900 tracking-tight"
            : "font-mono text-sm font-medium text-ink-900"
        }
      >
        {value}
      </span>
    </div>
  );
}

function PatternPreview({ cfg }: { cfg: Cfg }) {
  const isOverlap = cfg.mode === "overlap";
  const blocks: { type: "a" | "p"; label?: string }[] = [];
  for (let i = 0; i < 2; i++) {
    blocks.push({ type: "a", label: `#${i + 1}` });
    if (!isOverlap) {
      for (let r = 0; r < cfg.repeats; r++) blocks.push({ type: "p" });
    }
  }
  return (
    <div className="flex h-7 items-center gap-1">
      {blocks.map((b, i) => (
        <div
          key={i}
          className={`rounded-[2px] font-mono text-[9px] text-white flex items-center justify-center ${
            b.type === "a" ? "bg-hisui-500" : "bg-ink-300"
          }`}
          style={{ flex: b.type === "a" ? 2 : 1, height: b.type === "a" ? 18 : 3 }}
        >
          {b.label}
        </div>
      ))}
      <span className="ml-1 font-mono text-[10px] text-ink-300">…</span>
    </div>
  );
}
