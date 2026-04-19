import { invoke } from "@tauri-apps/api/core";
import type { Cfg, ExportOptions, FileMeta, Segment } from "./types";

export interface AudioFileInfo {
  path: string;
  name: string;
  meta: FileMeta;
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

export interface ExportRequest {
  filePath: string;
  segments: Segment[];
  cfg: Cfg;
  format: ExportOptions["format"];
  bitrateKbps: number;
  outputPath: string;
}

export async function requestExport(req: ExportRequest): Promise<void> {
  return invoke("request_export", {
    filePath: req.filePath,
    segments: req.segments,
    cfg: req.cfg,
    format: req.format,
    bitrateKbps: req.bitrateKbps,
    outputPath: req.outputPath,
  });
}
