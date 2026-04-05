import { useAppStore } from "../stores/appStore";

export function ProgressOverlay() {
  const sidecarStatus = useAppStore((s) => s.sidecarStatus);
  const progress = useAppStore((s) => s.processingProgress);
  const message = useAppStore((s) => s.processingMessage);
  const isExporting = useAppStore((s) => s.isExporting);

  const isVisible = sidecarStatus === "processing" || isExporting;
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-80 rounded-xl bg-gray-900 p-6 shadow-2xl">
        <p className="mb-3 text-sm text-gray-300">
          {message || "Processing..."}
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-gray-700">
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-right text-xs text-gray-500">{progress}%</p>
      </div>
    </div>
  );
}
