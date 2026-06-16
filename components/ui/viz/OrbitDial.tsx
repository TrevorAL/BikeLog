import { cn } from "@/lib/utils";

type OrbitDialTone = "sky" | "orange" | "emerald" | "slate" | "amber" | "red";

export type OrbitDialStat = {
  label: string;
  value: number | string;
  tone: "emerald" | "amber" | "orange" | "red" | "slate";
};

type OrbitDialProps = {
  label: string;
  sublabel?: string;
  value: number;
  min?: number;
  max?: number;
  suffix?: string;
  tone?: OrbitDialTone;
  stats?: OrbitDialStat[];
  className?: string;
};

const toneStyles: Record<OrbitDialTone, { stroke: string; glow: string }> = {
  sky:     { stroke: "#0ea5e9", glow: "rgba(14,165,233,0.18)"  },
  emerald: { stroke: "#10b981", glow: "rgba(16,185,129,0.18)"  },
  amber:   { stroke: "#f59e0b", glow: "rgba(245,158,11,0.18)"  },
  orange:  { stroke: "#f97316", glow: "rgba(249,115,22,0.18)"  },
  red:     { stroke: "#ef4444", glow: "rgba(239,68,68,0.18)"   },
  slate:   { stroke: "#64748b", glow: "rgba(100,116,139,0.18)" },
};

const sublabelToneStyles: Record<OrbitDialTone, string> = {
  emerald: "text-emerald-600",
  amber:   "text-amber-600",
  orange:  "text-orange-500",
  red:     "text-red-600",
  sky:     "text-sky-600",
  slate:   "text-slate-500",
};

const statToneStyles: Record<OrbitDialStat["tone"], { value: string; dot: string }> = {
  emerald: { value: "text-emerald-600", dot: "bg-emerald-500" },
  amber:   { value: "text-amber-600",   dot: "bg-amber-400"   },
  orange:  { value: "text-orange-500",  dot: "bg-orange-500"  },
  red:     { value: "text-red-600",     dot: "bg-red-500"     },
  slate:   { value: "text-slate-400",   dot: "bg-slate-300"   },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function OrbitDial({
  label,
  sublabel,
  value,
  min = 0,
  max = 100,
  suffix = "",
  tone = "sky",
  stats,
  className,
}: OrbitDialProps) {
  const bounded = clamp(value, min, max);
  const ratio = max > min ? (bounded - min) / (max - min) : 0;
  const strokeWidth = 8;
  const radius = 42;
  const center = 56;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - ratio);
  const toneStyle = toneStyles[tone];
  const valueText = `${Number.isInteger(bounded) ? bounded : bounded.toFixed(1)}${suffix}`;

  return (
    <article className={cn("surface-card flex h-full flex-col p-4", className)}>
      <p className="text-sm font-semibold text-slate-700">{label}</p>

      <div className="flex flex-1 items-center justify-center py-1">
        <div className="relative grid place-items-center" style={{ width: 144, height: 144 }}>
          <svg viewBox="0 0 112 112" className="h-full w-full -rotate-90">
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={strokeWidth}
            />
            {Array.from({ length: 32 }).map((_, i) => {
              const angle = (i / 32) * Math.PI * 2;
              const outerR = radius + strokeWidth / 2 + 3;
              const innerR = outerR - (i % 8 === 0 ? 5 : 2.5);
              return (
                <line
                  key={i}
                  x1={center + Math.cos(angle) * outerR}
                  y1={center + Math.sin(angle) * outerR}
                  x2={center + Math.cos(angle) * innerR}
                  y2={center + Math.sin(angle) * innerR}
                  stroke={i % 8 === 0 ? "#94a3b8" : "#cbd5e1"}
                  strokeWidth={i % 8 === 0 ? 1.2 : 0.8}
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
            className="absolute flex flex-col items-center justify-center rounded-full bg-white"
            style={{
              width: 82,
              height: 82,
              boxShadow: `0 0 0 1px #e2e8f0, 0 0 0 8px ${toneStyle.glow}, 0 2px 8px rgba(15,23,42,0.06)`,
            }}
          >
            <p className="text-2xl font-bold leading-none text-slate-900">{valueText}</p>
            {sublabel ? (
              <p className={`mt-1 text-[9px] font-semibold uppercase tracking-widest ${sublabelToneStyles[tone]}`}>
                {sublabel}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {stats && stats.length > 0 ? (
        <div className="border-t border-slate-100 pt-3">
          <dl className={`grid gap-2 ${stats.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
            {stats.map((stat) => {
              const s = statToneStyles[stat.tone];
              return (
                <div key={stat.label} className="flex flex-col items-center gap-0.5">
                  <dd className={`text-xl font-bold leading-none ${s.value}`}>{stat.value}</dd>
                  <dt className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-wide text-slate-400">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
                    {stat.label}
                  </dt>
                </div>
              );
            })}
          </dl>
        </div>
      ) : null}
    </article>
  );
}
