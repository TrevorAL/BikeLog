import Link from "next/link";

type StravaReconnectBannerProps = {
  failCount: number;
};

export function StravaReconnectBanner({ failCount }: StravaReconnectBannerProps) {
  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-amber-900">Strava sync is failing</p>
          <p className="mt-0.5 text-xs text-amber-800">
            {failCount} consecutive sync{failCount === 1 ? "" : "s"} failed — your ride data may be out of date.
          </p>
        </div>
        <Link
          href="/api/strava/connect?redirectTo=/rides"
          className="shrink-0 rounded-md bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-800"
        >
          Reconnect Strava →
        </Link>
      </div>
    </div>
  );
}
