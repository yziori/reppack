import { useCallback, useEffect } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { ArrowLeft, Check, Download, Sparkles } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import { useAudioPlayer } from "../../hooks/useAudioPlayer";
import { requestExport } from "../../lib/tauriCommands";
import {
  CanvasShell,
  DisplayHeading,
  Eyebrow,
  Lede,
  PageMarker,
} from "../../components/wizard/CanvasShell";
import { Button } from "../../components/Button";
import { t } from "../../lib/i18n";
import { PreviewPlayer } from "./components/PreviewPlayer";
import { ExportOptionsPanel } from "./components/ExportOptions";

export function StepExport() {
  const sourceFilePath = useAppStore((s) => s.sourceFilePath);
  const sourceFileName = useAppStore((s) => s.sourceFileName);
  const segments = useAppStore((s) => s.segments);
  const cfg = useAppStore((s) => s.cfg);
  const exportOptions = useAppStore((s) => s.exportOptions);
  const isExporting = useAppStore((s) => s.isExporting);
  const exportProgress = useAppStore((s) => s.exportProgress);
  const exportedFilePath = useAppStore((s) => s.exportedFilePath);
  const setExportOptions = useAppStore((s) => s.setExportOptions);
  const setExporting = useAppStore((s) => s.setExporting);
  const setExportedFilePath = useAppStore((s) => s.setExportedFilePath);
  const setStep = useAppStore((s) => s.setStep);
  const reset = useAppStore((s) => s.reset);

  const player = useAudioPlayer();
  const pauseMsFromCfg =
    cfg.pauseKind === "preset" ? cfg.pausePreset * 1000 : cfg.pauseRatio * 1500;

  useEffect(() => {
    if (sourceFilePath && !player.isLoaded) {
      player.load(sourceFilePath).catch(console.error);
    }
  }, [sourceFilePath, player]);

  const handleExport = useCallback(async () => {
    if (!sourceFilePath || !sourceFileName) return;
    const defaultName =
      sourceFileName.replace(/\.[^.]+$/, "") + `.pack.${exportOptions.format}`;
    const outputPath = await save({
      defaultPath: defaultName,
      filters: [
        {
          name: exportOptions.format.toUpperCase(),
          extensions: [exportOptions.format],
        },
      ],
    });
    if (!outputPath) return;

    setExporting(true, 0);
    setExportedFilePath(null);
    try {
      await requestExport({
        filePath: sourceFilePath,
        segments,
        cfg,
        format: exportOptions.format,
        bitrateKbps: exportOptions.bitrateKbps,
        outputPath,
      });
      setExportedFilePath(outputPath);
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      setExporting(false);
    }
  }, [
    sourceFilePath,
    sourceFileName,
    segments,
    cfg,
    exportOptions,
    setExporting,
    setExportedFilePath,
  ]);

  const onPickDir = async () => {
    const dir = await save({ defaultPath: "~/Documents/RepPack/" });
    if (dir) setExportOptions({ outputDir: dir });
  };

  return (
    <CanvasShell
      head={
        <div>
          <Eyebrow>STEP 05 · EXPORT</Eyebrow>
          <DisplayHeading>{t.export.h}</DisplayHeading>
          <Lede>{t.export.sub}</Lede>
        </div>
      }
      right={<PageMarker num={5} total={5} />}
      foot={
        <>
          <Button variant="ghost" onClick={() => setStep(3)}>
            <ArrowLeft className="h-3.5 w-3.5" /> 戻る
          </Button>
          <div className="flex-1" />
          {exportedFilePath ? (
            <>
              <Button variant="default" onClick={() => reset()}>
                <Sparkles className="h-3.5 w-3.5" /> {t.export.newPackage}
              </Button>
              <Button
                variant="primary"
                onClick={() => revealItemInDir(exportedFilePath)}
              >
                <Download className="h-3.5 w-3.5" /> {t.export.openFolder}
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              onClick={handleExport}
              disabled={isExporting}
              className="min-w-[180px]"
            >
              {isExporting ? (
                <>書き出し中… {Math.floor(exportProgress)}%</>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" /> {t.export.go}
                </>
              )}
            </Button>
          )}
        </>
      }
    >
      <div className="grid grid-cols-[1.2fr_1fr] gap-6">
        <PreviewPlayer
          cfg={cfg}
          segments={segments}
          isPlaying={player.isPlaying}
          onPlay={() => player.playWithGaps(segments, pauseMsFromCfg)}
          onPause={player.pause}
        />
        <div>
          <ExportOptionsPanel
            options={exportOptions}
            onChange={setExportOptions}
            onPickDir={onPickDir}
          />
          {exportedFilePath && (
            <div className="mt-3 flex items-center gap-2 rounded-md border border-ok/30 bg-ok/10 p-3 text-ok">
              <Check className="h-4 w-4" strokeWidth={3} />
              <div className="text-sm">{t.export.ok}</div>
            </div>
          )}
        </div>
      </div>
    </CanvasShell>
  );
}
