import type { ReactNode } from "react";

type Tone = "accent" | "hisui" | "neutral" | "err";

interface ChipProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

const tones: Record<Tone, string> = {
  accent: "bg-shiori-100 text-shiori-600 border-shiori-400/40",
  hisui: "bg-hisui-100 text-hisui-600 border-hisui-500/30",
  neutral: "bg-paper-2 text-ink-700 border-paper-edge",
  err: "bg-err/10 text-err border-err/30",
};

export function Chip({ tone = "neutral", children, className = "" }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 h-6 rounded-full border text-xs font-mono ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
