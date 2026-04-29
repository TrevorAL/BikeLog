import type { ReactNode } from "react";
import { CloudDrizzle, Route, Timer } from "lucide-react";

type RideCardProps = {
  date: Date | string;
  distanceMiles: number;
  durationMinutes?: number | null;
  rideType: string;
  weather?: string | null;
  roadCondition?: string | null;
  wasWet?: boolean;
  notes?: string | null;
  actions?: ReactNode;
};

export function RideCard({
  date,
  distanceMiles,
  durationMinutes,
  rideType,
  weather,
  roadCondition,
  wasWet,
  notes,
  actions,
}: RideCardProps) {
  const normalizedDate = date instanceof Date ? date : new Date(date);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-600">{rideType.replaceAll("_", " ")}</p>
          <h3 className="font-display text-lg font-semibold text-slate-900">
            {normalizedDate.toLocaleDateString()}
          </h3>
        </div>
        {wasWet ? (
          <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800">
            Wet ride
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <p className="text-xs text-slate-600">Distance</p>
          <p className="font-semibold text-slate-900">{distanceMiles.toFixed(1)} mi</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <p className="text-xs text-slate-600">Duration</p>
          <p className="font-semibold text-slate-900">
            {durationMinutes ? `${durationMinutes} min` : "Not set"}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <p className="text-xs text-slate-600">Road</p>
          <p className="font-semibold text-slate-900">{roadCondition ?? "Unknown"}</p>
        </div>
      </div>

      <div className="mt-4 space-y-1 text-sm text-slate-600">
        {weather ? (
          <p className="flex items-center gap-2">
            <CloudDrizzle className="h-4 w-4 text-slate-600" />
            {weather}
          </p>
        ) : null}
        {notes ? (
          <p className="flex items-start gap-2">
            <Route className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
            {notes}
          </p>
        ) : null}
        {durationMinutes ? (
          <p className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-slate-600" />
            Component mileage auto-updates on save.
          </p>
        ) : null}
      </div>

      {actions ? <div className="mt-4">{actions}</div> : null}
    </article>
  );
}
