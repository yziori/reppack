import { invoke } from "@tauri-apps/api/core";
import type { Segment } from "./types";

export interface AudioFileInfo {
  path: string;
  name: string;
}

export async function importAudio(path: string): Promise<AudioFileInfo> {
  return invoke("import_audio", { path });
}

export async function startSidecar(): Promise<void> {
  return invoke("start_sidecar");
}

export async function stopSidecar(): Promise<void> {
  return invoke("stop_sidecar");
}

export async function requestTranscription(
  filePath: string,
  language?: string,
): Promise<void> {
  return invoke("request_transcription", { filePath, language });
}

export async function requestExport(
  filePath: string,
  segments: Segment[],
  pauseMs: number,
  outputPath: string,
): Promise<void> {
  return invoke("request_export", {
    filePath,
    segments,
    pauseMs,
    outputPath,
  });
}
