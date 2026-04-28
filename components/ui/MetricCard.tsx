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
    <article className={cn("rounded-3xl border border-orange-200 bg-white p-4 shadow-warm", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-orange-900/70">{title}</p>
          <p className="font-display mt-1 text-2xl font-bold text-orange-950">{value}</p>
          {subtitle ? <p className="mt-1 text-xs text-orange-900/70">{subtitle}</p> : null}
        </div>
        {icon ? <div className="text-orange-600">{icon}</div> : null}
      </div>
    </article>
  );
}
