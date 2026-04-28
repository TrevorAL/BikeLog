import type { ReactNode } from "react";

import { Bike } from "lucide-react";

type BikeSummaryCardProps = {
  name: string;
  subtitle: string;
  children: ReactNode;
};

export function BikeSummaryCard({ name, subtitle, children }: BikeSummaryCardProps) {
  return (
    <section className="rounded-3xl border border-orange-200 bg-white p-5 shadow-warm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-orange-900/70">Primary bike</p>
          <h2 className="font-display mt-1 text-2xl font-semibold text-orange-950">{name}</h2>
          <p className="mt-1 text-sm text-orange-900/75">{subtitle}</p>
        </div>
        <span className="rounded-2xl bg-orange-100 p-3 text-orange-700">
          <Bike className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
