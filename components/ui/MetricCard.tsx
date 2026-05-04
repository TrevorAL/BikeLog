import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type MetricCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  className?: string;
};

export function MetricCard({ title, value, subtitle, icon, className }: MetricCardProps) {
  return (
    <article
      className={cn(
        "flex h-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="font-display mt-1 text-2xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 min-h-4 text-xs text-slate-600">{subtitle ?? "\u00A0"}</p>
        </div>
        {icon ? <div className="text-slate-600">{icon}</div> : null}
      </div>
    </article>
  );
}
