import { useCallback } from "react";
import { useAppStore } from "./stores/appStore";
import { useAudioPlayer } from "./hooks/useAudioPlayer";
import { useSidecar } from "./hooks/useSidecar";
import { requestTranscription } from "./lib/tauriCommands";
import { FileImport } from "./components/FileImport";
import { SegmentList } from "./components/SegmentList";
import { Player } from "./components/Player";
import { PauseControl } from "./components/PauseControl";
import { ExportButton } from "./components/ExportButton";
import { ProgressOverlay } from "./components/ProgressOverlay";
import { Mic } from "lucide-react";

function App() {
  const sourceFilePath = useAppStore((s) => s.sourceFilePath);
  const segments = useAppStore((s) => s.segments);
  const pauseDurationMs = useAppStore((s) => s.pauseDurationMs);
  const sidecarStatus = useAppStore((s) => s.sidecarStatus);
  const setSidecarStatus = useAppStore((s) => s.setSidecarStatus);
  const setProcessingProgress = useAppStore((s) => s.setProcessingProgress);

  const { start: startSidecar } = useSidecar();
  const player = useAudioPlayer();

  const handleTranscribe = useCallback(async () => {
    if (!sourceFilePath) return;

    try {
      if (sidecarStatus !== "ready") {
        await startSidecar();
      }

      setSidecarStatus("processing");
      setProcessingProgress(0, "Starting transcription...");
      await requestTranscription(sourceFilePath);
      await player.load(sourceFilePath);
    } catch (e) {
      console.error("Transcription failed:", e);
    }
  }, [sourceFilePath, sidecarStatus, startSidecar, setSidecarStatus, setProcessingProgress, player]);

  const handlePlay = useCallback(() => {
    player.playWithGaps(segments, pauseDurationMs);
  }, [player, segments, pauseDurationMs]);

  return (
    <main className="flex min-h-screen flex-col bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">reppack</h1>
          <ExportButton />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* Import */}
        <FileImport />

        {/* Transcribe Button */}
        {sourceFilePath && segments.length === 0 && (
          <button
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={handleTranscribe}
            disabled={sidecarStatus === "processing"}
          >
            <Mic className="h-4 w-4" />
            Transcribe
          </button>
        )}

        {/* Player Controls */}
        {segments.length > 0 && (
          <div className="flex items-center gap-4">
            <Player
              isPlaying={player.isPlaying}
              isPaused={player.isPaused}
              isLoaded={player.isLoaded}
              hasSegments={segments.length > 0}
              onPlay={handlePlay}
              onPause={player.pause}
              onResume={player.resume}
              onStop={player.stop}
            />
            <div className="flex-1">
              <PauseControl />
            </div>
          </div>
        )}

        {/* Segment List */}
        <SegmentList onSegmentClick={player.seekToSegment} />
      </div>

      {/* Progress Overlay */}
      <ProgressOverlay />
    </main>
  );
}

export default App;
