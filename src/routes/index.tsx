import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAppStore } from "../stores/appStore";
import { TitleBar } from "../components/wizard/TitleBar";
import { Sidebar } from "../components/wizard/Sidebar";
import { StepImport } from "../features/StepImport";
import { StepTranscribe } from "../features/StepTranscribe";
import { StepReview } from "../features/StepReview";
import { StepConfigure } from "../features/StepConfigure";
import { StepExport } from "../features/StepExport";
import { t } from "../lib/i18n";
import type { WizardStep } from "../lib/types";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

const isMac =
  typeof navigator !== "undefined" &&
  /Mac/i.test(navigator.platform || navigator.userAgent);

function IndexPage() {
  const step = useAppStore((s) => s.step);
  const setStep = useAppStore((s) => s.setStep);
  const sourceFileName = useAppStore((s) => s.sourceFileName);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && step > 0) {
        setStep((step - 1) as WizardStep);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, setStep]);

  const title = `${t.appTitle}${sourceFileName ? ` — ${sourceFileName}` : ""}`;

  useEffect(() => {
    getCurrentWindow().setTitle(title).catch(() => {});
  }, [title]);

  const stepCmp = [
    <StepImport key={0} />,
    <StepTranscribe key={1} />,
    <StepReview key={2} />,
    <StepConfigure key={3} />,
    <StepExport key={4} />,
  ][step];

  return (
    <>
      {isMac && <TitleBar title={title} />}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar current={step} onStep={setStep} />
        {stepCmp}
      </div>
    </>
  );
}
