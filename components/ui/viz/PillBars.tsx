import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PillBarsItem = {
  label: string;
  value: number;
  hint?: string;
};

type PillBarsProps = {
  title: string;
  items: PillBarsItem[];
  valueSuffix?: string;
  tone?: "sky" | "orange" | "emerald" | "slate";
  maxValue?: number;
  minBarPercent?: number;
  scrollable?: boolean;
  listMaxHeightClassName?: string;
  headerAction?: ReactNode;
  className?: string;
};

const toneClasses: Record<PillBarsProps["tone"] extends infer T ? Exclude<T, undefined> : never, string> = {
  sky: "from-sky-500 to-cyan-400",
  orange: "from-orange-500 to-amber-400",
  emerald: "from-emerald-500 to-teal-400",
  slate: "from-slate-500 to-slate-400",
};

export function PillBars({
  title,
  items,
  valueSuffix = "",
  tone = "sky",
  maxValue,
  minBarPercent = 8,
  scrollable = false,
  listMaxHeightClassName = "max-h-44 overflow-y-auto pr-1",
  headerAction,
  className,
}: PillBarsProps) {
  const filtered = items.filter((item) => Number.isFinite(item.value) && item.value >= 0).slice(0, 8);
  const computedMaxValue = filtered.length > 0 ? Math.max(...filtered.map((item) => item.value), 1) : 1;
  const maxValueForBars = Math.max(1, maxValue ?? computedMaxValue);
  const barClass = toneClasses[tone];
  const list = (
    <ul className="space-y-2.5">
      {filtered.map((item) => {
        const widthPercent = Math.min(
          100,
          Math.max(minBarPercent, (item.value / maxValueForBars) * 100),
        );
        return (
          <li key={`${item.label}-${item.value}`} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-xs">
              <p className="truncate font-medium text-slate-700">{item.label}</p>
              <p className="font-semibold text-slate-800">
                {Number.isInteger(item.value) ? item.value : item.value.toFixed(1)}
                {valueSuffix}
              </p>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${barClass}`}
                style={{ width: `${widthPercent}%` }}
              />
            </div>
            {item.hint ? <p className="text-[11px] text-slate-500">{item.hint}</p> : null}
          </li>
        );
      })}
    </ul>
  );

  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </div>
      {filtered.length > 0 ? (
        scrollable ? (
          <div className={cn("mt-3 min-h-0 flex-1", listMaxHeightClassName)}>{list}</div>
        ) : (
          <div className="mt-3">{list}</div>
        )
      ) : (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          No values to chart yet.
        </p>
      )}
    </article>
  );
}
