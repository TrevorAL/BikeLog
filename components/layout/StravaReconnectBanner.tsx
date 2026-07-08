import Link from "next/link";

import { SystemBanner } from "@/components/layout/SystemBanner";

type StravaReconnectBannerProps = {
  failCount: number;
};

export function StravaReconnectBanner({ failCount }: StravaReconnectBannerProps) {
  return (
    <SystemBanner
      dismissKey="strava-reconnect"
      accent="warning"
      action={
        <Link
          href="/api/strava/connect?redirectTo=/rides"
          className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
        >
          Reconnect Strava
        </Link>
      }
    >
      <span className="font-semibold text-slate-900">Strava sync is failing</span> —{" "}
      {failCount} consecutive sync{failCount === 1 ? "" : "s"} failed; ride data may be stale.
    </SystemBanner>
  );
}
