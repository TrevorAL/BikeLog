type WaveSparklineProps = {
  title: string;
  values: number[];
  valueLabel?: string;
  subtitle?: string;
  tone?: "sky" | "orange" | "emerald";
};

const toneMap = {
  sky: {
    stroke: "#0284c7",
    fillFrom: "rgba(14,165,233,0.35)",
    fillTo: "rgba(14,165,233,0.02)",
    badge: "bg-sky-100 text-sky-800",
  },
  orange: {
    stroke: "#ea580c",
    fillFrom: "rgba(249,115,22,0.35)",
    fillTo: "rgba(249,115,22,0.02)",
    badge: "bg-orange-100 text-orange-800",
  },
  emerald: {
    stroke: "#059669",
    fillFrom: "rgba(16,185,129,0.35)",
    fillTo: "rgba(16,185,129,0.02)",
    badge: "bg-emerald-100 text-emerald-800",
  },
} as const;

function toPath(values: number[], width: number, height: number, padding: number) {
  if (values.length === 0) {
    return {
      line: "",
      area: "",
      points: [] as Array<{ x: number; y: number }>,
    };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;
  const stepX = values.length > 1 ? graphWidth / (values.length - 1) : 0;

  const points = values.map((value, index) => {
    const x = padding + stepX * index;
    const normalized = (value - min) / range;
    const y = padding + graphHeight - normalized * graphHeight;
    return { x, y };
  });

  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");

  const area = `${line} L ${(padding + graphWidth).toFixed(1)} ${(height - padding).toFixed(1)} L ${padding.toFixed(1)} ${(height - padding).toFixed(1)} Z`;

  return { line, area, points };
}

export function WaveSparkline({
  title,
  values,
  valueLabel,
  subtitle,
  tone = "sky",
}: WaveSparklineProps) {
  const height = 126;
  const width = 320;
  const padding = 14;
  const colors = toneMap[tone];
  const { line, area, points } = toPath(values, width, height, padding);
  const latestPoint = points[points.length - 1];

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs text-slate-600">{subtitle}</p> : null}
        </div>
        {valueLabel ? (
          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${colors.badge}`}>{valueLabel}</span>
        ) : null}
      </div>
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 px-2 py-2">
        {values.length > 1 ? (
          <svg viewBox={`0 0 ${width} ${height}`} className="h-28 w-full">
            <defs>
              <linearGradient id={`spark-fill-${tone}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.fillFrom} />
                <stop offset="100%" stopColor={colors.fillTo} />
              </linearGradient>
            </defs>
            <path d={area} fill={`url(#spark-fill-${tone})`} />
            <path d={line} fill="none" stroke={colors.stroke} strokeWidth="3" strokeLinecap="round" />
            {latestPoint ? (
              <circle
                cx={latestPoint.x}
                cy={latestPoint.y}
                r="4.8"
                fill="#fff"
                stroke={colors.stroke}
                strokeWidth="2.3"
              />
            ) : null}
          </svg>
        ) : (
          <p className="py-10 text-center text-sm text-slate-600">Add more data to see trend waves.</p>
        )}
      </div>
    </article>
  );
}
