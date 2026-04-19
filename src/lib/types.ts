export interface Segment {
  id: number;
  start: number; // seconds
  end: number; // seconds
  text: string;
}

export type SidecarStatus =
  | "idle"
  | "starting"
  | "ready"
  | "processing"
  | "error";

export type WizardStep = 0 | 1 | 2 | 3 | 4;

export type PracticeMode = "repeat" | "overlap";
export type PauseKind = "preset" | "ratio";

export interface Cfg {
  mode: PracticeMode;
  pauseKind: PauseKind;
  pausePreset: number;
  pauseRatio: number;
  speed: number;
  repeats: number;
}

export interface FileMeta {
  sizeBytes: number;
  durationSec: number;
  sampleRateHz: number;
  channels: number;
}

export interface ExportOptions {
  format: "mp3" | "m4a" | "wav";
  bitrateKbps: number;
  outputDir: string | null;
}
