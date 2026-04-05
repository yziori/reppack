import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useAppStore } from "../stores/appStore";
import { startSidecar, stopSidecar } from "../lib/tauriCommands";
import type { Segment } from "../lib/types";

interface SidecarResponse {
  id: string;
  status: string;
  payload: Record<string, unknown>;
}

export function useSidecar() {
  const setSidecarStatus = useAppStore((s) => s.setSidecarStatus);
  const setSegments = useAppStore((s) => s.setSegments);
  const setProcessingProgress = useAppStore((s) => s.setProcessingProgress);
  const setExporting = useAppStore((s) => s.setExporting);

  useEffect(() => {
    const unlistenOutput = listen<SidecarResponse>(
      "sidecar-output",
      (event) => {
        const response = event.payload;

        if (response.id === "init" && response.status === "ready") {
          setSidecarStatus("ready");
          return;
        }

        if (response.status === "progress") {
          const payload = response.payload;
          const percent = (payload.percent as number) ?? 0;
          const message = (payload.message as string) ?? "";
          setProcessingProgress(percent, message);
        }

        if (response.status === "success" && response.payload.segments) {
          const segments = response.payload.segments as Segment[];
          setSegments(segments);
          setSidecarStatus("ready");
          setProcessingProgress(0, "");
        }

        if (
          response.status === "success" &&
          response.payload.output_path
        ) {
          setExporting(false);
          setProcessingProgress(0, "");
        }

        if (response.status === "error") {
          setSidecarStatus("error");
          setProcessingProgress(
            0,
            (response.payload.message as string) ?? "Unknown error",
          );
        }
      },
    );

    const unlistenTerminated = listen("sidecar-terminated", () => {
      setSidecarStatus("idle");
    });

    return () => {
      unlistenOutput.then((fn) => fn());
      unlistenTerminated.then((fn) => fn());
    };
  }, [setSidecarStatus, setSegments, setProcessingProgress, setExporting]);

  const start = async () => {
    setSidecarStatus("starting");
    try {
      await startSidecar();
    } catch (e) {
      setSidecarStatus("error");
      throw e;
    }
  };

  const stop = async () => {
    await stopSidecar();
    setSidecarStatus("idle");
  };

  return { start, stop };
}
