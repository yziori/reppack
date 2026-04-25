import { create } from "zustand";
import type {
  Cfg,
  ExportOptions,
  FileMeta,
  Segment,
  SidecarStatus,
  WizardStep,
} from "../lib/types";

interface AppState {
  step: WizardStep;

  sourceFilePath: string | null;
  sourceFileName: string | null;
  fileMeta: FileMeta | null;
  sourceLang: string;

  sidecarStatus: SidecarStatus;
  processingProgress: number;
  processingMessage: string;
  transcribePhase: 0 | 1;
  latestTranscript: string;

  segments: Segment[];
  selectedSegmentId: number | null;

  cfg: Cfg;

  exportOptions: ExportOptions;
  isExporting: boolean;
  exportProgress: number;
  exportedFilePath: string | null;

  setStep: (step: WizardStep) => void;
  setSourceFile: (path: string, name: string, meta: FileMeta) => void;
  clearSourceFile: () => void;
  setSourceLang: (lang: string) => void;
  setSidecarStatus: (status: SidecarStatus) => void;
  setProcessingProgress: (progress: number, message: string, phase?: 0 | 1) => void;
  setLatestTranscript: (text: string) => void;
  setSegments: (segments: Segment[]) => void;
  updateSegment: (id: number, patch: Partial<Segment>) => void;
  mergeSegments: (id: number) => void;
  splitSegment: (id: number, charIdx: number) => void;
  deleteSegment: (id: number) => void;
  selectSegment: (id: number | null) => void;
  setCfg: (patch: Partial<Cfg>) => void;
  setExportOptions: (patch: Partial<ExportOptions>) => void;
  setExporting: (exporting: boolean, progress?: number) => void;
  setExportedFilePath: (path: string | null) => void;
  reset: () => void;
}

const initialCfg: Cfg = {
  mode: "repeat",
  pauseKind: "preset",
  pausePreset: 1.5,
  pauseRatio: 1.2,
  speed: 1,
  repeats: 2,
};

const initialExportOptions: ExportOptions = {
  format: "mp3",
  bitrateKbps: 192,
  outputDir: null,
};

const makeInitial = () => ({
  step: 0 as WizardStep,
  sourceFilePath: null,
  sourceFileName: null,
  fileMeta: null,
  sourceLang: "auto",
  sidecarStatus: "idle" as SidecarStatus,
  processingProgress: 0,
  processingMessage: "",
  transcribePhase: 0 as 0 | 1,
  latestTranscript: "",
  segments: [] as Segment[],
  selectedSegmentId: null,
  cfg: { ...initialCfg },
  exportOptions: { ...initialExportOptions },
  isExporting: false,
  exportProgress: 0,
  exportedFilePath: null,
});

function renumber(segs: Segment[]): Segment[] {
  return segs.map((s, i) => ({ ...s, id: i + 1 }));
}

export const useAppStore = create<AppState>()((set) => ({
  ...makeInitial(),

  setStep: (step) => set({ step }),

  setSourceFile: (path, name, meta) =>
    set({
      sourceFilePath: path,
      sourceFileName: name,
      fileMeta: meta,
      segments: [],
      latestTranscript: "",
      processingProgress: 0,
      processingMessage: "",
      transcribePhase: 0,
      selectedSegmentId: null,
    }),

  clearSourceFile: () =>
    set({
      sourceFilePath: null,
      sourceFileName: null,
      fileMeta: null,
      segments: [],
      latestTranscript: "",
      processingProgress: 0,
      processingMessage: "",
      transcribePhase: 0,
      selectedSegmentId: null,
    }),

  setSourceLang: (lang) => set({ sourceLang: lang }),

  setSidecarStatus: (status) => set({ sidecarStatus: status }),

  setProcessingProgress: (progress, message, phase) =>
    set((s) => ({
      processingProgress: progress,
      processingMessage: message,
      transcribePhase: phase ?? s.transcribePhase,
    })),

  setLatestTranscript: (text) => set({ latestTranscript: text }),

  setSegments: (segments) => set({ segments: renumber(segments) }),

  updateSegment: (id, patch) =>
    set((s) => ({
      segments: s.segments.map((seg) =>
        seg.id === id ? { ...seg, ...patch } : seg,
      ),
    })),

  mergeSegments: (id) =>
    set((s) => {
      const idx = s.segments.findIndex((seg) => seg.id === id);
      if (idx <= 0) return s;
      const prev = s.segments[idx - 1];
      const curr = s.segments[idx];
      const merged: Segment = {
        id: prev.id,
        start: prev.start,
        end: curr.end,
        text: `${prev.text} ${curr.text}`.trim(),
      };
      const next = [...s.segments];
      next.splice(idx - 1, 2, merged);
      return { segments: renumber(next) };
    }),

  splitSegment: (id, charIdx) =>
    set((s) => {
      const idx = s.segments.findIndex((seg) => seg.id === id);
      if (idx < 0) return s;
      const seg = s.segments[idx];
      if (charIdx <= 0 || charIdx >= seg.text.length) return s;
      const ratio = charIdx / seg.text.length;
      const split = seg.start + (seg.end - seg.start) * ratio;
      const left: Segment = {
        id: seg.id,
        start: seg.start,
        end: split,
        text: seg.text.slice(0, charIdx).trim(),
      };
      const right: Segment = {
        id: seg.id + 1,
        start: split,
        end: seg.end,
        text: seg.text.slice(charIdx).trim(),
      };
      const next = [...s.segments];
      next.splice(idx, 1, left, right);
      return { segments: renumber(next) };
    }),

  deleteSegment: (id) =>
    set((s) => ({
      segments: renumber(s.segments.filter((seg) => seg.id !== id)),
    })),

  selectSegment: (id) => set({ selectedSegmentId: id }),

  setCfg: (patch) => set((s) => ({ cfg: { ...s.cfg, ...patch } })),

  setExportOptions: (patch) =>
    set((s) => ({ exportOptions: { ...s.exportOptions, ...patch } })),

  setExporting: (exporting, progress) =>
    set({ isExporting: exporting, exportProgress: progress ?? 0 }),

  setExportedFilePath: (path) => set({ exportedFilePath: path }),

  reset: () => set(makeInitial()),
}));
