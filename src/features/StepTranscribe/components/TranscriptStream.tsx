interface TranscriptStreamProps {
  latestText: string;
}

export function TranscriptStream({ latestText }: TranscriptStreamProps) {
  return (
    <div className="mt-6 border-t border-dashed border-paper-edge pt-5">
      <div className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink-500">
        直近のセグメント
      </div>
      <div className="font-serif text-base leading-relaxed text-ink-900 min-h-[44px]">
        {latestText || <span className="text-ink-300">…</span>}
      </div>
    </div>
  );
}
