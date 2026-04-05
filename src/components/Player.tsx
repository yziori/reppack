import { Play, Pause, Square } from "lucide-react";

interface PlayerProps {
  isPlaying: boolean;
  isLoaded: boolean;
  hasSegments: boolean;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export function Player({
  isPlaying,
  isLoaded,
  hasSegments,
  onPlay,
  onPause,
  onResume,
  onStop,
}: PlayerProps) {
  const canPlay = isLoaded && hasSegments;

  return (
    <div className="flex items-center gap-2">
      {isPlaying ? (
        <button
          className="rounded-lg bg-gray-700 p-2 text-white transition-colors hover:bg-gray-600"
          onClick={onPause}
        >
          <Pause className="h-5 w-5" />
        </button>
      ) : (
        <button
          className="rounded-lg bg-blue-600 p-2 text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!canPlay}
          onClick={canPlay ? (isLoaded ? onResume : onPlay) : undefined}
        >
          <Play className="h-5 w-5" />
        </button>
      )}
      <button
        className="rounded-lg bg-gray-700 p-2 text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!isPlaying}
        onClick={onStop}
      >
        <Square className="h-4 w-4" />
      </button>
    </div>
  );
}
