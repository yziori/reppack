import { useEffect, useState } from "react";
import { FileText, Layers } from "lucide-react";
import { useAppStore } from "../../stores/appStore";
import {
  CanvasShell,
  DisplayHeading,
  Eyebrow,
  Lede,
  PageMarker,
} from "../../components/wizard/CanvasShell";
import { NavFoot } from "../../components/wizard/NavFoot";
import { Segmented } from "../../components/Segmented";
import { Chip } from "../../components/Chip";
import { Kbd } from "../../components/Kbd";
import { t } from "../../lib/i18n";
import { ParagraphView } from "./components/ParagraphView";
import { SegmentList } from "./components/SegmentList";
import { TimelineBar } from "./components/TimelineBar";

type View = "paragraph" | "segments";

export function StepReview() {
  const segments = useAppStore((s) => s.segments);
  const selectedId = useAppStore((s) => s.selectedSegmentId);
  const selectSegment = useAppStore((s) => s.selectSegment);
  const mergeSegments = useAppStore((s) => s.mergeSegments);
  const deleteSegment = useAppStore((s) => s.deleteSegment);
  const setStep = useAppStore((s) => s.setStep);

  const [view, setView] = useState<View>("paragraph");
  const [playingId, setPlayingId] = useState<number | null>(null);

  useEffect(() => {
    if (selectedId === null && segments.length > 0) {
      selectSegment(segments[0].id);
    }
  }, [segments, selectedId, selectSegment]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedId) return;
      if (e.key === "m" || e.key === "M") mergeSegments(selectedId);
      if (e.key === "Backspace") deleteSegment(selectedId);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, mergeSegments, deleteSegment]);

  return (
    <CanvasShell
      head={
        <div>
          <Eyebrow>STEP 03 · REVIEW</Eyebrow>
          <DisplayHeading>{t.review.h}</DisplayHeading>
          <Lede>{t.review.sub}</Lede>
        </div>
      }
      right={<PageMarker num={3} total={5} />}
      foot={
        <NavFoot
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
          extraLeft={
            <div className="ml-1 flex items-center gap-2 text-[11px] text-ink-500">
              <Kbd>M</Kbd> 結合
              <Kbd>⌫</Kbd> 削除
            </div>
          }
        />
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Segmented
            value={view}
            onChange={(v) => setView(v as View)}
            options={[
              {
                value: "paragraph",
                label: (
                  <>
                    <FileText className="h-3 w-3" /> {t.review.viewParagraph}
                  </>
                ),
              },
              {
                value: "segments",
                label: (
                  <>
                    <Layers className="h-3 w-3" /> {t.review.viewSegments}
                  </>
                ),
              },
            ]}
          />
          <div className="flex-1" />
          <Chip tone="hisui">
            <Layers className="h-3 w-3" /> {segments.length} セグメント
          </Chip>
        </div>

        <TimelineBar segments={segments} selectedId={selectedId} onSelect={selectSegment} />

        {view === "paragraph" ? (
          <ParagraphView
            segments={segments}
            selectedId={selectedId}
            onSelect={selectSegment}
            onMergeBefore={mergeSegments}
          />
        ) : (
          <SegmentList
            segments={segments}
            selectedId={selectedId}
            playingId={playingId}
            onSelect={selectSegment}
            onTogglePlay={(id) => setPlayingId((cur) => (cur === id ? null : id))}
            onMerge={mergeSegments}
            onDelete={deleteSegment}
          />
        )}
      </div>
    </CanvasShell>
  );
}
