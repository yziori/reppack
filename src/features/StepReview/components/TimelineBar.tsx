import type { Segment } from "../../../lib/types";

interface TimelineBarProps {
  segments: Segment[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ds = Math.floor((sec % 1) * 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${ds}`;
}

export function TimelineBar({ segments, selectedId, onSelect }: TimelineBarProps) {
  if (segments.length === 0) return null;
  const total = segments[segments.length - 1].end - segments[0].start;
  const startSec = segments[0].start;
  const endSec = segments[segments.length - 1].end;

  return (
    <div className="rounded-lg border border-paper-edge bg-paper-0 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-widest text-shiori-500">
          timeline
        </span>
        <span className="font-mono text-[11px] text-ink-500">
          {fmt(startSec)} — {fmt(endSec)} · {total.toFixed(1)}s
        </span>
      </div>
      <div className="flex h-8 gap-0.5 overflow-hidden rounded">
        {segments.map((s) => {
          const dur = s.end - s.start;
          const w = (dur / total) * 100;
          const isSel = s.id === selectedId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              className={`px-1.5 text-left font-mono text-[10px] text-white transition-opacity ${
                isSel ? "bg-shiori-500 opacity-100" : "bg-hisui-500 opacity-55"
              }`}
              style={{ flex: `0 0 ${w}%` }}
              title={`#${s.id} · ${dur.toFixed(1)}s`}
            >
              {w > 12 && `#${s.id}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}
