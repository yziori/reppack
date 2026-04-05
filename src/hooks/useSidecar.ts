import { useEffect, useRef } from "react";
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

  // ready待ちのためのresolverを保持
  const readyResolverRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unlistenOutput = listen<SidecarResponse>(
      "sidecar-output",
      (event) => {
        const response = event.payload;

        if (response.id === "init" && response.status === "ready") {
          setSidecarStatus("ready");
          // readyを待っているPromiseを解決
          if (readyResolverRef.current) {
            readyResolverRef.current();
            readyResolverRef.current = null;
          }
          return;
        }

        if (response.status === "progress") {
          const payload = response.payload;
          const percent = (payload.percent as number) ?? 0;
          const message = (payload.message as string) ?? "";
          // transcribeのprogressはpercentがないのでsegments_so_farから推定
          if (percent === 0 && payload.segments_so_far != null) {
            const segmentsSoFar = payload.segments_so_far as number;
            const latestText = (payload.latest_text as string) ?? "";
            setProcessingProgress(
              Math.min(segmentsSoFar * 2, 95),
              `Segment ${segmentsSoFar}: ${latestText}`,
            );
          } else {
            setProcessingProgress(percent, message);
          }
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
          setSidecarStatus("ready");
          setProcessingProgress(0, "");
        }

        if (response.status === "error") {
          setSidecarStatus("error");
          setExporting(false);
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
      // 前回のプロセスが残っている場合はクリーンアップ
      try {
        await stopSidecar();
      } catch {
        // 停止失敗は無視（既に停止済みの場合）
      }
      await startSidecar();
      // readyイベントをPromiseで待つ（タイムアウト30秒）
      await new Promise<void>((resolve, reject) => {
        readyResolverRef.current = resolve;
        setTimeout(() => {
          if (readyResolverRef.current) {
            readyResolverRef.current = null;
            reject(new Error("Sidecar ready timeout"));
          }
        }, 30000);
      });
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
