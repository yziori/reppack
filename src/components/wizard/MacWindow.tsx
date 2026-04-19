import type { ReactNode } from "react";

interface MacWindowProps {
  title: string;
  children: ReactNode;
}

export function MacWindow({ title, children }: MacWindowProps) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-paper-edge bg-paper-1 shadow-warm-lg">
      <div className="flex h-10 items-center border-b border-paper-edge bg-paper-2 px-3">
        <div className="flex gap-2">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 text-center text-xs font-mono text-ink-500">
          {title}
        </div>
        <div className="w-14" />
      </div>
      <div className="flex flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
