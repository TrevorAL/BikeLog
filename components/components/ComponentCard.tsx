import type { ReactNode } from "react";
import { Gauge } from "lucide-react";

import type { MaintenanceStatus } from "@/lib/constants";
import { StatusBadge } from "@/components/ui/StatusBadge";

type ComponentCardProps = {
  name: string;
  brandModel: string;
  currentMileage: number;
  installDate?: Date | null;
  conditionStatus: MaintenanceStatus;
  nextMaintenance: string;
  actions?: ReactNode;
};

export function ComponentCard({
  name,
  brandModel,
  currentMileage,
  installDate,
  conditionStatus,
  nextMaintenance,
  actions,
}: ComponentCardProps) {
  return (
    <article className="rounded-3xl border border-orange-200 bg-white p-4 shadow-warm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-orange-950">{name}</h3>
          <p className="text-sm text-orange-900/70">{brandModel}</p>
        </div>
        <StatusBadge status={conditionStatus} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-orange-50 p-3">
          <p className="text-xs text-orange-700">Mileage</p>
          <p className="font-semibold text-orange-950">{Math.round(currentMileage)} mi</p>
        </div>
        <div className="rounded-2xl bg-orange-50 p-3">
          <p className="text-xs text-orange-700">Install date</p>
          <p className="font-semibold text-orange-950">
            {installDate ? installDate.toLocaleDateString() : "Not set"}
          </p>
        </div>
      </div>

      <p className="mt-4 flex items-center gap-2 text-sm text-orange-900/80">
        <Gauge className="h-4 w-4 text-orange-600" />
        {nextMaintenance}
      </p>

      {actions ? <div className="mt-4">{actions}</div> : null}
    </article>
  );
}
