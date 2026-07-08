import type { ReadinessTone } from "@/lib/readiness";
import { cn } from "@/lib/utils";

const SIZE = 188;
const RADIUS = 70;
const STROKE_WIDTH = 14;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const toneStyles: Record<ReadinessTone, { stroke: string; text: string }> = {
  good: { stroke: "#34d399", text: "text-emerald-300" },
  warning: { stroke: "#fbbf24", text: "text-amber-300" },
  attention: { stroke: "#f87171", text: "text-red-300" },
};

const COMPACT_SIZE = 56;
const COMPACT_RADIUS = 24;
const COMPACT_STROKE = 5;
const COMPACT_CIRCUMFERENCE = 2 * Math.PI * COMPACT_RADIUS;

type ReadinessGaugeProps = {
  score: number;
  label: string;
  tone: ReadinessTone;
  compact?: boolean;
  className?: string;
};

export function ReadinessGauge({ score, label, tone, compact, className }: ReadinessGaugeProps) {
  const clamped = Math.min(100, Math.max(0, score));
  const dashOffset = CIRCUMFERENCE * (1 - clamped / 100);
  const toneStyle = toneStyles[tone];

  if (compact) {
    const compactOffset = COMPACT_CIRCUMFERENCE * (1 - clamped / 100);

    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div
          className="relative grid shrink-0 place-items-center"
          style={{ width: COMPACT_SIZE, height: COMPACT_SIZE }}
        >
          <svg viewBox={`0 0 ${COMPACT_SIZE} ${COMPACT_SIZE}`} className="h-full w-full -rotate-90">
            <circle
              cx={COMPACT_SIZE / 2}
              cy={COMPACT_SIZE / 2}
              r={COMPACT_RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={COMPACT_STROKE}
            />
            <circle
              cx={COMPACT_SIZE / 2}
              cy={COMPACT_SIZE / 2}
              r={COMPACT_RADIUS}
              fill="none"
              stroke={toneStyle.stroke}
              strokeWidth={COMPACT_STROKE}
              strokeLinecap="round"
              strokeDasharray={COMPACT_CIRCUMFERENCE}
              strokeDashoffset={compactOffset}
            />
          </svg>
          <span className="absolute font-display text-xs font-bold text-white">
            {Math.round(clamped)}%
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
            Readiness
          </p>
          <p className={cn("text-sm font-semibold", toneStyle.text)}>{label}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-6 text-center shadow-elevated backdrop-blur-sm",
        className,
      )}
    >
      <div className="relative grid place-items-center" style={{ width: SIZE, height: SIZE }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full -rotate-90">
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={STROKE_WIDTH}
          />
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke={toneStyle.stroke}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="font-display text-4xl font-bold text-white">{Math.round(clamped)}%</span>
          <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Readiness
          </span>
        </div>
      </div>
      <p className={cn("text-sm font-semibold", toneStyle.text)}>{label}</p>
    </div>
  );
}
