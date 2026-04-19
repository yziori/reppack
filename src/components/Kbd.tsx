import type { ReactNode } from "react";

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded border border-paper-edge bg-paper-0 text-[10px] font-mono text-ink-500 shadow-warm-sm">
      {children}
    </span>
  );
}
