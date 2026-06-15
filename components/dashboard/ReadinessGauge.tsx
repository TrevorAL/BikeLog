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

type ReadinessGaugeProps = {
  score: number;
  label: string;
  tone: ReadinessTone;
  className?: string;
};

export function ReadinessGauge({ score, label, tone, className }: ReadinessGaugeProps) {
  const clamped = Math.min(100, Math.max(0, score));
  const dashOffset = CIRCUMFERENCE * (1 - clamped / 100);
  const toneStyle = toneStyles[tone];

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
