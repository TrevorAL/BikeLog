"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type StravaSyncSummary = {
  status: "CONNECTED" | "SUCCESS" | "NO_NEW_DATA" | "ERROR";
  lastSyncAt: string | null;
  lastSyncImportedCount: number;
  lastSyncError: string | null;
  totalImportedCount: number;
  expiresAt: string;
  scope: string;
};

type StravaConnectionSummary = {
  id: string;
  sync: StravaSyncSummary;
};

type PreviewActivity = {
  stravaActivityId: string;
  name: string;
  type: string;
  startedAt: string;
  distanceMiles: number;
  durationMinutes: number | null;
  suggestedRideType: string;
  alreadyImported: boolean;
  rideId: string | null;
};

type PreviewResponse = {
  activities: PreviewActivity[];
  sync: StravaSyncSummary;
  error?: string;
};

type ConfirmResponse = {
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  sync: {
    status: StravaSyncSummary["status"];
    lastSyncAt: string;
    lastSyncImportedCount: number;
    lastSyncError: string | null;
  };
  error?: string;
};

type StravaImportPanelProps = {
  bikeId?: string;
  disabled?: boolean;
  connection?: StravaConnectionSummary | null;
};

type StatusBanner = {
  type: "idle" | "success" | "error";
  message?: string;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(minutes: number | null) {
  if (!minutes || minutes <= 0) {
    return "-";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h ${remaining}m`;
}

function statusLabel(status: StravaSyncSummary["status"]) {
  if (status === "CONNECTED") {
    return "Connected";
  }

  if (status === "SUCCESS") {
    return "Import complete";
  }

  if (status === "NO_NEW_DATA") {
    return "No new rides";
  }

  return "Sync error";
}

export function StravaImportPanel({ bikeId, disabled = false, connection }: StravaImportPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sync, setSync] = useState<StravaSyncSummary | null>(connection?.sync ?? null);
  const [preview, setPreview] = useState<PreviewActivity[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewStatus, setPreviewStatus] = useState<StatusBanner>({ type: "idle" });
  const [confirmStatus, setConfirmStatus] = useState<StatusBanner>({ type: "idle" });

  const flashStatus = searchParams.get("strava");
  const flashMessage = searchParams.get("stravaMessage");

  const selectableIds = useMemo(
    () => preview.filter((activity) => !activity.alreadyImported).map((activity) => activity.stravaActivityId),
    [preview],
  );

  const hasConnection = Boolean(connection);

  async function loadPreview() {
    if (disabled || !hasConnection) {
      return;
    }

    setPreviewStatus({ type: "idle" });
    setConfirmStatus({ type: "idle" });
    setIsPreviewLoading(true);

    try {
      const response = await fetch("/api/strava/import/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bikeId,
          limit: 20,
        }),
      });

      const result = (await response.json()) as PreviewResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Could not load Strava preview.");
      }

      setPreview(result.activities);
      setSelectedIds(result.activities.filter((activity) => !activity.alreadyImported).map((activity) => activity.stravaActivityId));
      setSync(result.sync);

      if (result.activities.length === 0) {
        setPreviewStatus({
          type: "success",
          message: "No recent cycling activities found in Strava.",
        });
      } else {
        setPreviewStatus({
          type: "success",
          message: "Preview loaded. Select rides to import.",
        });
      }
    } catch (error) {
      setPreviewStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Could not load Strava preview right now.",
      });
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function importSelected() {
    if (selectedIds.length === 0 || disabled || !hasConnection) {
      return;
    }

    setIsImporting(true);
    setConfirmStatus({ type: "idle" });

    try {
      const response = await fetch("/api/strava/import/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bikeId,
          activityIds: selectedIds,
        }),
      });

      const result = (await response.json()) as ConfirmResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Could not import rides.");
      }

      setSync((current) =>
        current
          ? {
              ...current,
              status: result.sync.status,
              lastSyncAt: result.sync.lastSyncAt,
              lastSyncImportedCount: result.sync.lastSyncImportedCount,
              lastSyncError: result.sync.lastSyncError,
              totalImportedCount: current.totalImportedCount + result.importedCount,
            }
          : current,
      );

      setConfirmStatus({
        type: "success",
        message: `Imported ${result.importedCount} ride(s). Skipped ${result.skippedCount}.`,
      });

      setSelectedIds([]);
      router.refresh();
    } catch (error) {
      setConfirmStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Could not import rides right now.",
      });
    } finally {
      setIsImporting(false);
    }
  }

  if (disabled) {
    return (
      <section className="rounded-3xl border border-orange-200 bg-white p-5 shadow-warm">
        <h2 className="font-display text-xl font-semibold text-orange-950">Strava import</h2>
        <p className="mt-2 text-sm text-orange-900/70">
          Create a bike first to enable Strava import.
        </p>
      </section>
    );
  }

  if (!hasConnection) {
    return (
      <section className="rounded-3xl border border-orange-200 bg-white p-5 shadow-warm">
        <h2 className="font-display text-xl font-semibold text-orange-950">Strava import</h2>
        <p className="mt-2 text-sm text-orange-900/80">
          Connect your Strava account to preview recent rides and import only what you want.
        </p>

        {flashStatus === "error" ? (
          <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-800">
            {flashMessage ?? "Strava connection failed."}
          </p>
        ) : null}

        <Link
          href="/api/strava/connect?redirectTo=/rides"
          className="mt-4 inline-flex rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700"
        >
          Connect Strava
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-orange-200 bg-white p-5 shadow-warm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-orange-950">Strava import</h2>
          <p className="mt-1 text-sm text-orange-900/75">
            Preview recent rides, then import selected activities into this bike.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void loadPreview();
          }}
          disabled={isPreviewLoading || isImporting}
          className="rounded-full border border-orange-300 px-4 py-2 text-sm font-semibold text-orange-900 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPreviewLoading ? "Loading..." : "Preview recent rides"}
        </button>
      </div>

      {flashStatus === "connected" ? (
        <p className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {flashMessage ?? "Strava connected successfully."}
        </p>
      ) : null}

      {flashStatus === "error" ? (
        <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-800">
          {flashMessage ?? "Strava connection failed."}
        </p>
      ) : null}

      {sync ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <p className="rounded-2xl border border-orange-100 bg-orange-50 px-3 py-2 text-xs text-orange-900">
            Status: <span className="font-semibold">{statusLabel(sync.status)}</span>
          </p>
          <p className="rounded-2xl border border-orange-100 bg-orange-50 px-3 py-2 text-xs text-orange-900">
            Last sync: <span className="font-semibold">{formatDateTime(sync.lastSyncAt)}</span>
          </p>
          <p className="rounded-2xl border border-orange-100 bg-orange-50 px-3 py-2 text-xs text-orange-900">
            Last imported: <span className="font-semibold">{sync.lastSyncImportedCount}</span>
          </p>
          <p className="rounded-2xl border border-orange-100 bg-orange-50 px-3 py-2 text-xs text-orange-900">
            Imported total: <span className="font-semibold">{sync.totalImportedCount}</span>
          </p>
          <p className="rounded-2xl border border-orange-100 bg-orange-50 px-3 py-2 text-xs text-orange-900">
            Token expires: <span className="font-semibold">{formatDateTime(sync.expiresAt)}</span>
          </p>
          <p className="rounded-2xl border border-orange-100 bg-orange-50 px-3 py-2 text-xs text-orange-900">
            Scope: <span className="font-semibold">{sync.scope}</span>
          </p>
        </div>
      ) : null}

      {sync?.status === "ERROR" && sync.lastSyncError ? (
        <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-800">{sync.lastSyncError}</p>
      ) : null}

      {previewStatus.type === "success" && previewStatus.message ? (
        <p className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {previewStatus.message}
        </p>
      ) : null}

      {previewStatus.type === "error" && previewStatus.message ? (
        <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-800">{previewStatus.message}</p>
      ) : null}

      {preview.length > 0 ? (
        <div className="mt-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-orange-900">
              {preview.length} {preview.length === 1 ? "activity" : "activities"} in preview
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds(selectableIds)}
                className="rounded-full border border-orange-300 px-3 py-1 text-xs font-semibold text-orange-900 hover:bg-orange-100"
              >
                Select all new
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="rounded-full border border-orange-300 px-3 py-1 text-xs font-semibold text-orange-900 hover:bg-orange-100"
              >
                Clear
              </button>
            </div>
          </div>

          <ul className="space-y-2">
            {preview.map((activity) => {
              const isChecked = selectedIds.includes(activity.stravaActivityId);
              const isDisabled = activity.alreadyImported;

              return (
                <li
                  key={activity.stravaActivityId}
                  className="rounded-2xl border border-orange-100 bg-orange-50 px-3 py-2"
                >
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isDisabled}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setSelectedIds((current) =>
                            current.includes(activity.stravaActivityId)
                              ? current
                              : [...current, activity.stravaActivityId],
                          );
                        } else {
                          setSelectedIds((current) =>
                            current.filter((id) => id !== activity.stravaActivityId),
                          );
                        }
                      }}
                      className="mt-1 h-4 w-4 rounded border-orange-300 text-orange-600"
                    />
                    <div className="min-w-0 flex-1 text-sm text-orange-900">
                      <p className="truncate font-semibold">{activity.name}</p>
                      <p className="text-xs text-orange-900/70">
                        {formatDateTime(activity.startedAt)} | {activity.type} | {activity.distanceMiles.toFixed(1)} mi | {formatDuration(activity.durationMinutes)}
                      </p>
                      <p className="mt-1 text-xs text-orange-900/75">
                        Suggested ride type: {activity.suggestedRideType.replaceAll("_", " ")}
                      </p>
                    </div>
                    {activity.alreadyImported ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                        Imported
                      </span>
                    ) : null}
                  </label>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={() => {
              void importSelected();
            }}
            disabled={selectedIds.length === 0 || isImporting || isPreviewLoading}
            className="mt-4 rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isImporting ? "Importing..." : `Import selected (${selectedIds.length})`}
          </button>
        </div>
      ) : null}

      {confirmStatus.type === "success" && confirmStatus.message ? (
        <p className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {confirmStatus.message}
        </p>
      ) : null}

      {confirmStatus.type === "error" && confirmStatus.message ? (
        <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-800">
          {confirmStatus.message}
        </p>
      ) : null}
    </section>
  );
}
