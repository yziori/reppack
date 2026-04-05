import { save } from "@tauri-apps/plugin-dialog";
import { Download } from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { requestExport } from "../lib/tauriCommands";

export function ExportButton() {
  const sourceFilePath = useAppStore((s) => s.sourceFilePath);
  const segments = useAppStore((s) => s.segments);
  const pauseDurationMs = useAppStore((s) => s.pauseDurationMs);
  const setExporting = useAppStore((s) => s.setExporting);
  const setSidecarStatus = useAppStore((s) => s.setSidecarStatus);

  const canExport = sourceFilePath && segments.length > 0;

  const handleExport = async () => {
    if (!sourceFilePath) return;

    const outputPath = await save({
      defaultPath: "reppack-output.mp3",
      filters: [{ name: "MP3", extensions: ["mp3"] }],
    });
    if (!outputPath) return;

    setExporting(true);
    setSidecarStatus("processing");
    await requestExport(sourceFilePath, segments, pauseDurationMs, outputPath);
  };

  return (
    <button
      className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-40"
      disabled={!canExport}
      onClick={handleExport}
    >
      <Download className="h-4 w-4" />
      Export MP3
    </button>
  );
}
