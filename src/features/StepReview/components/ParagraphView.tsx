import type { Segment } from "../../../lib/types";

interface ParagraphViewProps {
  segments: Segment[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onMergeBefore: (id: number) => void;
}

export function ParagraphView({
  segments,
  selectedId,
  onSelect,
  onMergeBefore,
}: ParagraphViewProps) {
  return (
    <div className="rounded-lg border border-paper-edge bg-paper-0 px-8 py-7 min-h-[340px]">
      <div className="mb-4 font-serif italic text-xs text-ink-500">¶ transcript</div>
      <p
        className="font-serif text-lg leading-[1.9] text-ink-900"
        style={{ textWrap: "pretty" }}
      >
        {segments.map((s, i) => (
          <span key={s.id}>
            <span
              onClick={() => onSelect(s.id)}
              title={`#${s.id}`}
              className={`cursor-pointer rounded px-0.5 transition-colors ${
                selectedId === s.id
                  ? "bg-marker border-b-2 border-marker-line"
                  : "hover:bg-paper-2"
              }`}
            >
              {s.text}
            </span>
            {i < segments.length - 1 && (
              <button
                type="button"
                onClick={() => onMergeBefore(segments[i + 1].id)}
                className="mx-1 font-mono text-shiori-500 hover:text-shiori-600"
                title="クリックで結合"
              >
                /
              </button>
            )}
          </span>
        ))}
      </p>
      <div className="mt-6 border-t border-paper-edge pt-4 flex gap-4 font-mono text-[11px] text-ink-500">
        <span>
          <span className="text-shiori-500">/</span> クリックで結合
        </span>
      </div>
    </div>
  );
}
