import { CloudDrizzle, Route, Timer } from "lucide-react";

type RideCardProps = {
  date: Date;
  distanceMiles: number;
  durationMinutes?: number | null;
  rideType: string;
  weather?: string | null;
  roadCondition?: string | null;
  wasWet?: boolean;
  notes?: string | null;
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
}: RideCardProps) {
  return (
    <article className="rounded-3xl border border-orange-200 bg-white p-4 shadow-warm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-orange-700">{rideType.replaceAll("_", " ")}</p>
          <h3 className="font-display text-lg font-semibold text-orange-950">{date.toLocaleDateString()}</h3>
        </div>
        {wasWet ? (
          <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800">
            Wet ride
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-orange-50 p-3 text-sm">
          <p className="text-xs text-orange-700">Distance</p>
          <p className="font-semibold text-orange-950">{distanceMiles.toFixed(1)} mi</p>
        </div>
        <div className="rounded-2xl bg-orange-50 p-3 text-sm">
          <p className="text-xs text-orange-700">Duration</p>
          <p className="font-semibold text-orange-950">
            {durationMinutes ? `${durationMinutes} min` : "Not set"}
          </p>
        </div>
        <div className="rounded-2xl bg-orange-50 p-3 text-sm">
          <p className="text-xs text-orange-700">Road</p>
          <p className="font-semibold text-orange-950">{roadCondition ?? "Unknown"}</p>
        </div>
      </div>

      <div className="mt-4 space-y-1 text-sm text-orange-900/80">
        {weather ? (
          <p className="flex items-center gap-2">
            <CloudDrizzle className="h-4 w-4 text-orange-600" />
            {weather}
          </p>
        ) : null}
        {notes ? (
          <p className="flex items-start gap-2">
            <Route className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
            {notes}
          </p>
        ) : null}
        {durationMinutes ? (
          <p className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-orange-600" />
            Component mileage auto-updates on save.
          </p>
        ) : null}
      </div>
    </article>
  );
}
