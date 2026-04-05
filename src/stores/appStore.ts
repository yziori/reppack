import { create } from "zustand";
import type { Segment, SidecarStatus } from "../lib/types";

interface AppState {
  // File
  sourceFilePath: string | null;
  sourceFileName: string | null;

  // Processing
  sidecarStatus: SidecarStatus;
  processingProgress: number;
  processingMessage: string;

  // Segments
  segments: Segment[];

  // Playback
  currentSegmentIndex: number;

  // Settings
  pauseDurationMs: number;

  // Export
  isExporting: boolean;

  // Actions
  setSourceFile: (path: string, name: string) => void;
  setSidecarStatus: (status: SidecarStatus) => void;
  setProcessingProgress: (progress: number, message: string) => void;
  setSegments: (segments: Segment[]) => void;
  setPauseDuration: (ms: number) => void;
  setCurrentSegmentIndex: (index: number) => void;
  setExporting: (exporting: boolean) => void;
}

const initialState = {
  sourceFilePath: null,
  sourceFileName: null,
  sidecarStatus: "idle" as SidecarStatus,
  processingProgress: 0,
  processingMessage: "",
  segments: [],
  currentSegmentIndex: 0,
  pauseDurationMs: 3000,
  isExporting: false,
};

export const useAppStore = create<AppState>()((set) => ({
  ...initialState,

  setSourceFile: (path, name) =>
    set({ sourceFilePath: path, sourceFileName: name }),

  setSidecarStatus: (status) => set({ sidecarStatus: status }),

  setProcessingProgress: (progress, message) =>
    set({ processingProgress: progress, processingMessage: message }),

  setSegments: (segments) => set({ segments }),

  setPauseDuration: (ms) => set({ pauseDurationMs: ms }),

  setCurrentSegmentIndex: (index) => set({ currentSegmentIndex: index }),

  setExporting: (exporting) => set({ isExporting: exporting }),
}));
