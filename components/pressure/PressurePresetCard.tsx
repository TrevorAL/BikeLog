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
    <article className="rounded-3xl border border-orange-200 bg-white p-4 shadow-warm">
      <h3 className="font-display text-lg font-semibold text-orange-950">{name}</h3>
      <p className="mt-1 text-sm text-orange-900/70">
        {formatPressureSurface(surface)} · {formatPressurePreference(preference)}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-orange-50 p-3 text-center">
          <p className="text-xs text-orange-700">Front</p>
          <p className="font-display text-xl font-bold text-orange-950">{frontPsi} PSI</p>
        </div>
        <div className="rounded-2xl bg-orange-50 p-3 text-center">
          <p className="text-xs text-orange-700">Rear</p>
          <p className="font-display text-xl font-bold text-orange-950">{rearPsi} PSI</p>
        </div>
      </div>
      {notes ? <p className="mt-3 text-sm text-orange-900/75">Notes: {notes}</p> : null}
      {actions ? <div className="mt-4">{actions}</div> : null}
    </article>
  );
}
