import { cn } from "@/lib/utils";

type WaveSparklineProps = {
  title: string;
  values: number[];
  valueLabel?: string;
  subtitle?: string;
  tone?: "sky" | "orange" | "emerald";
  size?: "default" | "large";
  detailed?: boolean;
  xAxisLabels?: {
    left: string;
    right: string;
  };
  className?: string;
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
      min: 0,
      max: 0,
      range: 1,
      graphWidth: width - padding * 2,
      graphHeight: height - padding * 2,
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

  return { line, area, points, min, max, range, graphWidth, graphHeight };
}

export function WaveSparkline({
  title,
  values,
  valueLabel,
  subtitle,
  tone = "sky",
  size = "default",
  detailed = false,
  xAxisLabels,
  className,
}: WaveSparklineProps) {
  const isLarge = size === "large";
  const height = isLarge ? 220 : 126;
  const width = isLarge ? 720 : 320;
  const padding = detailed ? 28 : 14;
  const colors = toneMap[tone];
  const { line, area, points, graphHeight, min, max, range } = toPath(values, width, height, padding);
  const latestPoint = points[points.length - 1];
  const average = values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const gradientId = `spark-fill-${tone}-${size}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const yTickRatios = detailed ? [0, 0.25, 0.5, 0.75, 1] : [];

  return (
    <article className={cn("rounded-2xl border border-slate-200 bg-white p-4 shadow-sm", className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs text-slate-600">{subtitle}</p> : null}
        </div>
        {valueLabel ? (
          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${colors.badge}`}>{valueLabel}</span>
        ) : null}
      </div>
      {detailed && values.length > 0 ? (
        <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
            <p className="uppercase tracking-wide text-slate-500">Latest</p>
            <p className="font-semibold text-slate-800">{values[values.length - 1].toFixed(1)} mi</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
            <p className="uppercase tracking-wide text-slate-500">Average</p>
            <p className="font-semibold text-slate-800">{average.toFixed(1)} mi</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
            <p className="uppercase tracking-wide text-slate-500">Peak</p>
            <p className="font-semibold text-slate-800">{max.toFixed(1)} mi</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
            <p className="uppercase tracking-wide text-slate-500">Lowest</p>
            <p className="font-semibold text-slate-800">{min.toFixed(1)} mi</p>
          </div>
        </div>
      ) : null}
      <div className={cn("mt-3 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 px-2 py-2", isLarge ? "px-3 py-3" : "")}>
        {values.length > 1 ? (
          <svg viewBox={`0 0 ${width} ${height}`} className={cn("w-full", isLarge ? "h-56" : "h-28")}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.fillFrom} />
                <stop offset="100%" stopColor={colors.fillTo} />
              </linearGradient>
            </defs>
            {yTickRatios.map((ratio) => {
              const y = (padding + graphHeight - ratio * graphHeight).toFixed(1);
              const tickValue = min + ratio * range;
              return (
                <g key={`tick-${ratio}`}>
                  <line
                    x1={padding}
                    y1={y}
                    x2={(width - padding).toFixed(1)}
                    y2={y}
                    stroke="#cbd5e1"
                    strokeDasharray={ratio === 0 || ratio === 1 ? "0" : "4 4"}
                    strokeWidth="1"
                  />
                  <text x={6} y={Number(y) + 3} fontSize="10" fill="#64748b">
                    {tickValue.toFixed(0)}
                  </text>
                </g>
              );
            })}
            <path d={area} fill={`url(#${gradientId})`} />
            <path d={line} fill="none" stroke={colors.stroke} strokeWidth="3" strokeLinecap="round" />
            {detailed
              ? points.map((point, index) => (
                  <circle
                    key={`${point.x}-${point.y}-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r="2.1"
                    fill={colors.stroke}
                    opacity={0.85}
                  />
                ))
              : null}
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
        {detailed && xAxisLabels ? (
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>{xAxisLabels.left}</span>
            <span>{xAxisLabels.right}</span>
          </div>
        ) : null}
      </div>
    </article>
  );
}
