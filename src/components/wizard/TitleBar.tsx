interface TitleBarProps {
  title: string;
}

export function TitleBar({ title }: TitleBarProps) {
  return (
    <div
      data-tauri-drag-region
      className="flex h-7 shrink-0 items-center justify-center border-b border-paper-edge bg-paper-2 pl-20 pr-20"
    >
      <div className="text-xs font-mono text-ink-500">{title}</div>
    </div>
  );
}
