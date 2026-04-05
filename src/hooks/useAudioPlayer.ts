import { useCallback, useEffect, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { Segment } from "../lib/types";
import { useAppStore } from "../stores/appStore";

interface UseAudioPlayerReturn {
  load: (filePath: string) => Promise<void>;
  playWithGaps: (segments: Segment[], pauseMs: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seekToSegment: (index: number) => void;
  isPlaying: boolean;
  isPaused: boolean;
  currentSegment: number;
  isLoaded: boolean;
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const scheduledNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const playStartTimeRef = useRef<number>(0);
  const segmentTimingsRef = useRef<{ start: number; end: number }[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSegment, setCurrentSegment] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const setCurrentSegmentIndex = useAppStore((s) => s.setCurrentSegmentIndex);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const stopAllNodes = useCallback(() => {
    scheduledNodesRef.current.forEach((node) => {
      try {
        node.stop();
        node.disconnect();
      } catch {
        // Node may already be stopped
      }
    });
    scheduledNodesRef.current = [];
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const load = useCallback(
    async (filePath: string) => {
      const ctx = getAudioContext();
      const url = convertFileSrc(filePath);
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      audioBufferRef.current = await ctx.decodeAudioData(arrayBuffer);
      setIsLoaded(true);
    },
    [getAudioContext],
  );

  const playWithGaps = useCallback(
    (segments: Segment[], pauseMs: number) => {
      const ctx = getAudioContext();
      const buffer = audioBufferRef.current;
      if (!buffer) return;

      stopAllNodes();

      const pauseSec = pauseMs / 1000;
      let scheduleTime = ctx.currentTime + 0.05;
      const timings: { start: number; end: number }[] = [];
      const nodes: AudioBufferSourceNode[] = [];

      for (const seg of segments) {
        const duration = seg.end - seg.start;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(scheduleTime, seg.start, duration);
        nodes.push(source);

        timings.push({
          start: scheduleTime - ctx.currentTime,
          end: scheduleTime - ctx.currentTime + duration,
        });

        scheduleTime += duration + pauseSec;
      }

      scheduledNodesRef.current = nodes;
      segmentTimingsRef.current = timings;
      playStartTimeRef.current = ctx.currentTime;
      setIsPlaying(true);
      setIsPaused(false);
      setCurrentSegment(0);

      // Track current segment
      const trackSegment = () => {
        const elapsed = ctx.currentTime - playStartTimeRef.current;
        const timings = segmentTimingsRef.current;
        let found = -1;
        for (let i = 0; i < timings.length; i++) {
          if (elapsed >= timings[i].start && elapsed < timings[i].end) {
            found = i;
            break;
          }
        }
        if (found >= 0) {
          setCurrentSegment(found);
          setCurrentSegmentIndex(found);
        }

        // Check if playback is done
        const lastTiming = timings[timings.length - 1];
        if (lastTiming && elapsed > lastTiming.end) {
          setIsPlaying(false);
          return;
        }

        animationFrameRef.current = requestAnimationFrame(trackSegment);
      };
      animationFrameRef.current = requestAnimationFrame(trackSegment);

      // Auto-stop when last node ends
      const lastNode = nodes[nodes.length - 1];
      if (lastNode) {
        lastNode.onended = () => {
          setIsPlaying(false);
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
        };
      }
    },
    [getAudioContext, stopAllNodes, setCurrentSegmentIndex],
  );

  const pause = useCallback(() => {
    const ctx = audioContextRef.current;
    if (ctx && ctx.state === "running") {
      ctx.suspend();
      setIsPlaying(false);
      setIsPaused(true);
    }
  }, []);

  const resume = useCallback(() => {
    const ctx = audioContextRef.current;
    if (ctx && ctx.state === "suspended") {
      ctx.resume();
      setIsPlaying(true);
      setIsPaused(false);
    }
  }, []);

  const stop = useCallback(() => {
    stopAllNodes();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSegment(0);
    setCurrentSegmentIndex(0);
  }, [stopAllNodes, setCurrentSegmentIndex]);

  const seekToSegment = useCallback(
    (index: number) => {
      setCurrentSegment(index);
      setCurrentSegmentIndex(index);
    },
    [setCurrentSegmentIndex],
  );

  useEffect(() => {
    return () => {
      stopAllNodes();
      audioContextRef.current?.close();
    };
  }, [stopAllNodes]);

  return {
    load,
    playWithGaps,
    pause,
    resume,
    stop,
    seekToSegment,
    isPlaying,
    isPaused,
    currentSegment,
    isLoaded,
  };
}
