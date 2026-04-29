import type { ReactNode } from "react";

import { formatPressurePreference, formatPressureSurface } from "@/lib/pressure-options";

type PressurePresetCardProps = {
  name: string;
  frontPsi: number;
  rearPsi: number;
  surface: string;
  preference: string;
  notes?: string | null;
  actions?: ReactNode;
};

export function PressurePresetCard({
  name,
  frontPsi,
  rearPsi,
  surface,
  preference,
  notes,
  actions,
}: PressurePresetCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="font-display text-lg font-semibold text-slate-900">{name}</h3>
      <p className="mt-1 text-sm text-slate-600">
        {formatPressureSurface(surface)} · {formatPressurePreference(preference)}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-slate-50 p-3 text-center">
          <p className="text-xs text-slate-600">Front</p>
          <p className="font-display text-xl font-bold text-slate-900">{frontPsi} PSI</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-center">
          <p className="text-xs text-slate-600">Rear</p>
          <p className="font-display text-xl font-bold text-slate-900">{rearPsi} PSI</p>
        </div>
      </div>
      {notes ? <p className="mt-3 text-sm text-slate-600">Notes: {notes}</p> : null}
      {actions ? <div className="mt-4">{actions}</div> : null}
    </article>
  );
}
