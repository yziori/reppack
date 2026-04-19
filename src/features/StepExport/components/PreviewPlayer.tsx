import { useEffect, useState } from "react";
import { Headphones, Pause, Play } from "lucide-react";
import { Button } from "../../../components/Button";
import { Chip } from "../../../components/Chip";
import type { Cfg, Segment } from "../../../lib/types";

interface PreviewPlayerProps {
  cfg: Cfg;
  segments: Segment[];
  onPlay: () => void;
  onPause: () => void;
  isPlaying: boolean;
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function PreviewPlayer({
  cfg,
  segments,
  onPlay,
  onPause,
  isPlaying,
}: PreviewPlayerProps) {
  const [pos, setPos] = useState(0);
  const totalSec = segments.reduce((a, s) => a + (s.end - s.start), 0);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(
      () => setPos((p) => (p >= totalSec ? 0 : p + 0.1)),
      100,
    );
    return () => clearInterval(id);
  }, [isPlaying, totalSec]);

  const activeIdx = (() => {
    let acc = 0;
    for (let i = 0; i < segments.length; i++) {
      acc += segments[i].end - segments[i].start;
      if (pos <= acc) return i;
    }
    return segments.length - 1;
  })();

  return (
    <div className="overflow-hidden rounded-lg border border-paper-edge bg-paper-0">
      <div className="flex items-center gap-3 border-b border-paper-edge px-5 py-3">
        <Chip tone="accent">
          <Headphones className="h-3 w-3" /> Preview
        </Chip>
        <span className="font-mono text-[11px] text-ink-500">
          {cfg.mode} · ×{cfg.speed} · pause{" "}
          {cfg.pauseKind === "preset"
            ? `×${cfg.pausePreset}`
            : `ratio ${cfg.pauseRatio}`}
        </span>
      </div>

      <div className="border-b border-paper-edge px-6 py-5 font-serif text-base leading-relaxed text-ink-900 min-h-[180px]">
        {segments.map((s, i) => (
          <span
            key={s.id}
            className={`mr-1 transition-opacity ${
              i === activeIdx
                ? "opacity-100 bg-marker px-0.5 border-b-2 border-marker-line"
                : "opacity-40"
            }`}
          >
            {s.text}{" "}
          </span>
        ))}
      </div>

      <div className="bg-paper-2 px-6 pt-5 pb-4">
        <div className="flex items-center gap-4">
          <Button
            variant="primary"
            className="h-10 w-10 rounded-full !p-0"
            onClick={() => (isPlaying ? onPause() : onPlay())}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <div className="flex-1 flex justify-between font-mono text-[11px] text-ink-500">
            <span>{fmt(pos)}</span>
            <span>—</span>
            <span>{fmt(totalSec)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
