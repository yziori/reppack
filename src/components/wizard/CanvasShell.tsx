import type { ReactNode } from "react";

interface CanvasShellProps {
  head: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  foot?: ReactNode;
}

export function CanvasShell({ head, right, children, foot }: CanvasShellProps) {
  return (
    <section className="flex flex-1 flex-col overflow-hidden bg-paper-1">
      <header className="flex items-start justify-between gap-6 border-b border-paper-edge px-10 pt-8 pb-6">
        <div>{head}</div>
        {right && <div className="flex items-center gap-3">{right}</div>}
      </header>
      <div className="flex-1 overflow-auto px-10 py-8">{children}</div>
      {foot && (
        <footer className="flex items-center gap-3 border-t border-paper-edge px-10 py-4">
          {foot}
        </footer>
      )}
    </section>
  );
}

interface PageMarkerProps {
  num: number;
  total: number;
}

export function PageMarker({ num, total }: PageMarkerProps) {
  return (
    <div className="text-right font-serif italic text-ink-500">
      <div className="text-[10px] tracking-widest text-ink-300">PAGE</div>
      <div className="text-3xl font-semibold text-ink-900 not-italic">
        {String(num).padStart(2, "0")}
      </div>
      <div className="text-[10px] text-ink-300">
        — of {String(total).padStart(2, "0")} —
      </div>
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] font-mono uppercase tracking-widest text-shiori-500">
      — {children}
    </div>
  );
}

export function DisplayHeading({ children }: { children: ReactNode }) {
  return (
    <h1 className="mt-2.5 font-serif text-4xl font-semibold leading-tight tracking-tight text-ink-900">
      {children}
    </h1>
  );
}

export function Lede({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 max-w-[56ch] text-sm text-ink-500">{children}</div>
  );
}
