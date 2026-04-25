import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "./appStore";

describe("appStore", () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  describe("segments", () => {
    it("merges a segment with its previous one", () => {
      useAppStore.getState().setSegments([
        { id: 1, start: 0, end: 2, text: "Hello" },
        { id: 2, start: 2, end: 4, text: "world." },
        { id: 3, start: 4, end: 6, text: "Goodbye." },
      ]);
      useAppStore.getState().mergeSegments(2);
      const segs = useAppStore.getState().segments;
      expect(segs).toHaveLength(2);
      expect(segs[0]).toEqual({ id: 1, start: 0, end: 4, text: "Hello world." });
      expect(segs[1].id).toBe(2);
    });

    it("merging the first segment is a no-op", () => {
      useAppStore.getState().setSegments([
        { id: 1, start: 0, end: 2, text: "A" },
        { id: 2, start: 2, end: 4, text: "B" },
      ]);
      useAppStore.getState().mergeSegments(1);
      expect(useAppStore.getState().segments).toHaveLength(2);
    });

    it("splits a segment at the given char index", () => {
      useAppStore.getState().setSegments([
        { id: 1, start: 0, end: 6, text: "Hello world" },
      ]);
      useAppStore.getState().splitSegment(1, 5);
      const segs = useAppStore.getState().segments;
      expect(segs).toHaveLength(2);
      expect(segs[0].text).toBe("Hello");
      expect(segs[1].text).toBe("world");
      expect(segs[0].end).toBeCloseTo(segs[1].start);
    });

    it("deletes a segment and renumbers", () => {
      useAppStore.getState().setSegments([
        { id: 1, start: 0, end: 2, text: "A" },
        { id: 2, start: 2, end: 4, text: "B" },
        { id: 3, start: 4, end: 6, text: "C" },
      ]);
      useAppStore.getState().deleteSegment(2);
      const segs = useAppStore.getState().segments;
      expect(segs.map((s) => s.text)).toEqual(["A", "C"]);
      expect(segs.map((s) => s.id)).toEqual([1, 2]);
    });
  });

  describe("cfg", () => {
    it("updates only provided fields", () => {
      useAppStore.getState().setCfg({ speed: 1.25 });
      expect(useAppStore.getState().cfg.speed).toBe(1.25);
      expect(useAppStore.getState().cfg.mode).toBe("repeat");
    });
  });

  describe("reset", () => {
    it("returns the store to initial state", () => {
      useAppStore.getState().setStep(3);
      useAppStore.getState().setCfg({ speed: 1.5 });
      useAppStore.getState().reset();
      expect(useAppStore.getState().step).toBe(0);
      expect(useAppStore.getState().cfg.speed).toBe(1);
    });
  });

  describe("source file reset", () => {
    it("clearSourceFile resets derived state", () => {
      const s = useAppStore.getState();
      s.setSourceFile("/tmp/a.mp3", "a.mp3", {
        durationSec: 60,
        sizeBytes: 1024,
        sampleRateHz: 44100,
        channels: 2,
      });
      s.setSegments([{ id: 1, start: 0, end: 1, text: "hi" }]);
      s.setLatestTranscript("hi");
      s.setProcessingProgress(50, "halfway", 1);
      s.selectSegment(1);

      s.clearSourceFile();

      const state = useAppStore.getState();
      expect(state.sourceFilePath).toBeNull();
      expect(state.sourceFileName).toBeNull();
      expect(state.fileMeta).toBeNull();
      expect(state.segments).toEqual([]);
      expect(state.latestTranscript).toBe("");
      expect(state.processingProgress).toBe(0);
      expect(state.processingMessage).toBe("");
      expect(state.transcribePhase).toBe(0);
      expect(state.selectedSegmentId).toBeNull();
    });
  });
});
