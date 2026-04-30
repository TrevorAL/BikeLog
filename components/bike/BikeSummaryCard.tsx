import type { ReactNode } from "react";

import { Bike, ChevronDown } from "lucide-react";

type BikeSummaryCardProps = {
  name: string;
  subtitle: string;
  children: ReactNode;
};

export function BikeSummaryCard({ name, subtitle, children }: BikeSummaryCardProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-600">Primary bike</p>
          <h2 className="font-display mt-1 text-2xl font-semibold text-slate-900">{name}</h2>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>
        <span className="rounded-lg bg-slate-100 p-3 text-slate-600">
          <Bike className="h-5 w-5" />
        </span>
      </div>
      <details className="group mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
          Bike setup details
          <ChevronDown className="h-4 w-4 text-slate-600 transition group-open:rotate-180" />
        </summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">{children}</div>
      </details>
    </section>
  );
}
