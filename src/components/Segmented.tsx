import type { ReactNode } from "react";

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  className?: string;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className = "",
}: SegmentedProps<T>) {
  return (
    <div
      className={`inline-flex rounded-md border border-paper-edge bg-paper-0 p-0.5 ${className}`}
    >
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center justify-center gap-1 px-3 h-7 rounded-sm text-xs font-serif transition-colors ${
              on
                ? "bg-shiori-500 text-white"
                : "text-ink-700 hover:bg-paper-2"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
