type OrbitDialTone = "sky" | "orange" | "emerald" | "slate";

type OrbitDialProps = {
  label: string;
  value: number;
  min?: number;
  max?: number;
  suffix?: string;
  hint?: string;
  tone?: OrbitDialTone;
  size?: number;
};

const toneStyles: Record<OrbitDialTone, { stroke: string; glow: string; text: string }> = {
  sky: {
    stroke: "#0ea5e9",
    glow: "rgba(14,165,233,0.22)",
    text: "text-sky-700",
  },
  orange: {
    stroke: "#f97316",
    glow: "rgba(249,115,22,0.22)",
    text: "text-orange-700",
  },
  emerald: {
    stroke: "#10b981",
    glow: "rgba(16,185,129,0.22)",
    text: "text-emerald-700",
  },
  slate: {
    stroke: "#64748b",
    glow: "rgba(100,116,139,0.2)",
    text: "text-slate-700",
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function OrbitDial({
  label,
  value,
  min = 0,
  max = 100,
  suffix = "",
  hint,
  tone = "sky",
  size = 148,
}: OrbitDialProps) {
  const bounded = clamp(value, min, max);
  const ratio = max > min ? (bounded - min) / (max - min) : 0;
  const percent = ratio * 100;
  const strokeWidth = 11;
  const radius = 42;
  const center = 56;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - ratio);
  const toneStyle = toneStyles[tone];
  const dialShadow = `0 0 0 8px ${toneStyle.glow}`;
  const sizePx = `${size}px`;
  const valueText = `${Number.isInteger(bounded) ? bounded : bounded.toFixed(1)}${suffix}`;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <p className={`text-xs font-semibold ${toneStyle.text}`}>{Math.round(percent)}%</p>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <div className="relative grid place-items-center" style={{ width: sizePx, height: sizePx }}>
          <svg viewBox="0 0 112 112" className="h-full w-full -rotate-90">
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={strokeWidth}
            />
            {Array.from({ length: 24 }).map((_, index) => {
              const angle = (index / 24) * Math.PI * 2;
              const outer = radius + strokeWidth + 3;
              const inner = outer - (index % 6 === 0 ? 7 : 4);
              const x1 = center + Math.cos(angle) * outer;
              const y1 = center + Math.sin(angle) * outer;
              const x2 = center + Math.cos(angle) * inner;
              const y2 = center + Math.sin(angle) * inner;
              return (
                <line
                  key={index}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#cbd5e1"
                  strokeWidth={index % 6 === 0 ? 1.3 : 1}
                  strokeLinecap="round"
                />
              );
            })}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={toneStyle.stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
          </svg>
          <div
            className="absolute grid h-16 w-16 place-items-center rounded-full border border-slate-200 bg-white text-center"
            style={{ boxShadow: dialShadow }}
          >
            <p className="text-sm font-bold text-slate-900">{valueText}</p>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-slate-500">Range</p>
          <p className="text-sm font-semibold text-slate-800">
            {min}
            {suffix} - {max}
            {suffix}
          </p>
          {hint ? <p className="mt-2 text-xs text-slate-600">{hint}</p> : null}
        </div>
      </div>
    </article>
  );
}
