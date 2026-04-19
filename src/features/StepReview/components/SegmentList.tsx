import { Merge, Pause, Pencil, Play, Scissors, Trash } from "lucide-react";
import { Button } from "../../../components/Button";
import type { Segment } from "../../../lib/types";

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ds = Math.floor((sec % 1) * 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${ds}`;
}

interface SegmentListProps {
  segments: Segment[];
  selectedId: number | null;
  playingId: number | null;
  onSelect: (id: number) => void;
  onTogglePlay: (id: number) => void;
  onMerge: (id: number) => void;
  onDelete: (id: number) => void;
}

export function SegmentList({
  segments,
  selectedId,
  playingId,
  onSelect,
  onTogglePlay,
  onMerge,
  onDelete,
}: SegmentListProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-paper-edge bg-paper-0">
      {segments.map((s, i) => {
        const isSelected = s.id === selectedId;
        const isPlaying = s.id === playingId;
        const dur = s.end - s.start;
        return (
          <div
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`grid cursor-pointer grid-cols-[44px_82px_1fr_auto] items-start gap-3 px-4 py-4 transition-colors ${
              isSelected
                ? "bg-shiori-100/40 border-l-[3px] border-shiori-500"
                : "border-l-[3px] border-transparent"
            } ${i > 0 ? "border-t border-paper-edge" : ""}`}
          >
            <div className="font-mono text-[11px] text-ink-500 pt-1">
              #{String(s.id).padStart(2, "0")}
            </div>
            <div className="font-mono text-[11px] text-ink-700 leading-snug">
              <div>{fmt(s.start)}</div>
              <div className="text-ink-300">{fmt(s.end)}</div>
              <div className="text-shiori-500 mt-1">{dur.toFixed(1)}s</div>
            </div>
            <div className="font-serif text-base text-ink-900 leading-snug">
              {s.text}
            </div>
            <div className={`flex gap-1 ${isSelected ? "opacity-100" : "opacity-40"}`}>
              <Button
                variant="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePlay(s.id);
                }}
              >
                {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </Button>
              <Button
                variant="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onMerge(s.id);
                }}
                disabled={s.id === 1}
              >
                <Merge className="h-3 w-3" />
              </Button>
              <Button variant="icon" disabled>
                <Scissors className="h-3 w-3" />
              </Button>
              <Button variant="icon" disabled>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(s.id);
                }}
              >
                <Trash className="h-3 w-3" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
