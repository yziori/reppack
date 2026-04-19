import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { useSidecar } from "../../hooks/useSidecar";
import { requestTranscription } from "../../lib/tauriCommands";
import {
  CanvasShell,
  DisplayHeading,
  Eyebrow,
  Lede,
  PageMarker,
} from "../../components/wizard/CanvasShell";
import { Button } from "../../components/Button";
import { t } from "../../lib/i18n";
import { PhaseProgress } from "./components/PhaseProgress";
import { TranscriptStream } from "./components/TranscriptStream";

export function StepTranscribe() {
  const sourceFilePath = useAppStore((s) => s.sourceFilePath);
  const sourceLang = useAppStore((s) => s.sourceLang);
  const fileMeta = useAppStore((s) => s.fileMeta);
  const sidecarStatus = useAppStore((s) => s.sidecarStatus);
  const segments = useAppStore((s) => s.segments);
  const processingProgress = useAppStore((s) => s.processingProgress);
  const transcribePhase = useAppStore((s) => s.transcribePhase);
  const latestTranscript = useAppStore((s) => s.latestTranscript);
  const setStep = useAppStore((s) => s.setStep);
  const setSidecarStatus = useAppStore((s) => s.setSidecarStatus);
  const setProcessingProgress = useAppStore((s) => s.setProcessingProgress);

  const { start: startSidecar } = useSidecar();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    if (!sourceFilePath) return;
    if (segments.length > 0) return;
    startedRef.current = true;

    (async () => {
      try {
        if (sidecarStatus !== "ready") {
          await startSidecar();
        }
        setSidecarStatus("processing");
        setProcessingProgress(0, "Starting", 0);
        await requestTranscription(
          sourceFilePath,
          sourceLang === "auto" ? undefined : sourceLang,
        );
      } catch (e) {
        console.error("Transcription failed:", e);
        setSidecarStatus("error");
        setProcessingProgress(0, String(e));
      }
    })();
  }, [
    sourceFilePath,
    sourceLang,
    sidecarStatus,
    segments.length,
    startSidecar,
    setSidecarStatus,
    setProcessingProgress,
  ]);

  const totalSec = fileMeta?.durationSec ?? 0;
  const processedSec = Math.round((processingProgress / 100) * totalSec);
  const isDone = segments.length > 0;

  return (
    <CanvasShell
      head={
        <div>
          <Eyebrow>STEP 02 · ANALYZE</Eyebrow>
          <DisplayHeading>{t.transcribe.h}</DisplayHeading>
          <Lede>{t.transcribe.sub}</Lede>
        </div>
      }
      right={<PageMarker num={2} total={5} />}
      foot={
        <>
          <Button variant="ghost" onClick={() => setStep(0)}>
            <ArrowLeft className="h-3.5 w-3.5" /> 戻る
          </Button>
          <div className="flex-1" />
          <Button
            variant="primary"
            onClick={() => setStep(2)}
            disabled={!isDone}
          >
            {isDone ? "次へ" : `${Math.floor(processingProgress)}%`}
            {isDone && <ArrowRight className="h-3.5 w-3.5" />}
          </Button>
        </>
      }
    >
      <div className="mx-auto max-w-[720px]">
        <PhaseProgress
          phase={transcribePhase}
          percent={isDone ? 100 : processingProgress}
          processedSec={processedSec}
          totalSec={totalSec}
        />
        {transcribePhase === 1 && <TranscriptStream latestText={latestTranscript} />}
        {sidecarStatus === "error" && (
          <div className="mt-6 rounded-md border border-err/30 bg-err/10 p-4 text-sm text-err">
            {t.errors.sidecarStart}
            <button
              className="ml-3 underline"
              onClick={() => {
                startedRef.current = false;
                setSidecarStatus("idle");
              }}
            >
              {t.errors.retry}
            </button>
          </div>
        )}
      </div>
    </CanvasShell>
  );
}
