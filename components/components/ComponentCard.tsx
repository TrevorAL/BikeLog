import type { ReactNode } from "react";
import { Gauge } from "lucide-react";

import type { MaintenanceStatus } from "@/lib/constants";
import { StatusBadge } from "@/components/ui/StatusBadge";

type ComponentCardProps = {
  name: string;
  brandModel: string;
  currentMileage: number;
  mileageProgress?: string;
  installDate?: Date | null;
  conditionStatus: MaintenanceStatus;
  nextMaintenance: string;
  actions?: ReactNode;
  onClick?: () => void;
};

export function ComponentCard({
  name,
  brandModel,
  currentMileage,
  mileageProgress,
  installDate,
  conditionStatus,
  nextMaintenance,
  actions,
  onClick,
}: ComponentCardProps) {
  return (
    <article
      className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm ${onClick ? "cursor-pointer hover:bg-slate-50" : ""}`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) {
          return;
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold tracking-tight text-slate-900">{name}</h3>
          <p className="text-sm text-slate-600">{brandModel}</p>
        </div>
        <StatusBadge status={conditionStatus} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-slate-50 p-2.5">
          <p className="text-xs text-slate-600">Mileage</p>
          <p className="font-semibold text-slate-900">{Math.round(currentMileage)} mi</p>
          {mileageProgress ? (
            <p className="mt-0.5 text-xs text-slate-500">{mileageProgress}</p>
          ) : null}
        </div>
        <div className="rounded-lg bg-slate-50 p-2.5">
          <p className="text-xs text-slate-600">Install date</p>
          <p className="font-semibold text-slate-900">
            {installDate ? installDate.toLocaleDateString() : "Not set"}
          </p>
        </div>
      </div>

      <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
        <Gauge className="h-4 w-4 text-slate-600" />
        {nextMaintenance}
      </p>

      {actions ? (
        <div
          className="mt-3"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {actions}
        </div>
      ) : null}
    </article>
  );
}
