import { useAppStore } from "../stores/appStore";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins}:${secs.toString().padStart(2, "0")}.${ms}`;
}

interface SegmentListProps {
  onSegmentClick: (index: number) => void;
}

export function SegmentList({ onSegmentClick }: SegmentListProps) {
  const segments = useAppStore((s) => s.segments);
  const currentSegmentIndex = useAppStore((s) => s.currentSegmentIndex);

  if (segments.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-600">
        No segments yet. Import an MP3 and run transcription.
      </div>
    );
  }

  return (
    <div className="max-h-96 space-y-1 overflow-y-auto">
      {segments.map((seg, i) => (
        <button
          key={seg.id}
          className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
            i === currentSegmentIndex
              ? "bg-blue-900/50 text-blue-200"
              : "text-gray-300 hover:bg-gray-800"
          }`}
          onClick={() => onSegmentClick(i)}
        >
          <span className="mr-2 font-mono text-xs text-gray-500">
            {formatTime(seg.start)} - {formatTime(seg.end)}
          </span>
          <span>{seg.text}</span>
        </button>
      ))}
    </div>
  );
}
