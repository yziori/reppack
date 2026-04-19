interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
  className?: string;
}

export function Slider({
  value,
  min,
  max,
  step = 0.1,
  onChange,
  formatValue,
  className = "",
}: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={className}>
      {formatValue && (
        <div className="mb-2 text-center font-mono text-sm font-semibold text-shiori-500">
          {formatValue(value)}
        </div>
      )}
      <div className="relative h-5">
        <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded bg-paper-3" />
        <div
          className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 rounded bg-shiori-500"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 h-4 w-4 -translate-y-1/2 -translate-x-1/2 rounded-full bg-shiori-500 shadow-warm-sm ring-2 ring-paper-0"
          style={{ left: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    </div>
  );
}
