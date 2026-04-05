import { useAppStore } from "../stores/appStore";

export function PauseControl() {
  const pauseDurationMs = useAppStore((s) => s.pauseDurationMs);
  const setPauseDuration = useAppStore((s) => s.setPauseDuration);

  return (
    <div className="flex items-center gap-4">
      <label className="text-sm text-gray-400">Pause</label>
      <input
        type="range"
        min={500}
        max={10000}
        step={500}
        value={pauseDurationMs}
        onChange={(e) => setPauseDuration(Number(e.target.value))}
        className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-700 accent-blue-500"
      />
      <span className="w-14 text-right font-mono text-sm text-gray-300">
        {(pauseDurationMs / 1000).toFixed(1)}s
      </span>
    </div>
  );
}
