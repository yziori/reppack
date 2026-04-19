import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "../Button";

interface NavFootProps {
  onBack?: () => void;
  onNext?: () => void;
  backDisabled?: boolean;
  nextDisabled?: boolean;
  nextLabel?: string;
  extraLeft?: ReactNode;
  extraRight?: ReactNode;
}

export function NavFoot({
  onBack,
  onNext,
  backDisabled,
  nextDisabled,
  nextLabel = "次へ",
  extraLeft,
  extraRight,
}: NavFootProps) {
  return (
    <>
      {extraLeft}
      <Button variant="ghost" onClick={onBack} disabled={backDisabled}>
        <ArrowLeft className="h-3.5 w-3.5" /> 戻る
      </Button>
      <div className="flex-1" />
      {extraRight}
      <Button variant="primary" onClick={onNext} disabled={nextDisabled}>
        {nextLabel}
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </>
  );
}
