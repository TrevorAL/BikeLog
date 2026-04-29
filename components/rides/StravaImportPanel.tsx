"use client";

import { useEffect, useMemo, useState } from "react";
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
  gearId: string | null;
  gearName: string | null;
  startedAt: string;
  distanceMiles: number;
  durationMinutes: number | null;
  suggestedRideType: string;
  alreadyImported: boolean;
  rideId: string | null;
};

type StravaBikeOption = {
  id: string;
  label: string;
};

type PreviewResponse = {
  activities: PreviewActivity[];
  bikeOptions?: StravaBikeOption[];
  selectedBikeFilter?: string;
  sync: StravaSyncSummary;
  error?: string;
};

type ConfirmResponse = {
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  imported?: Array<{
    activityId: string;
    rideId: string;
  }>;
  sync: {
    status: StravaSyncSummary["status"];
    lastSyncAt: string;
    lastSyncImportedCount: number;
    lastSyncError: string | null;
  };
  error?: string;
};

type BikeOptionsResponse = {
  bikeOptions?: StravaBikeOption[];
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

const STRAVA_BIKE_FILTER_ALL = "all";
const STRAVA_BIKE_FILTER_NONE = "none";

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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewActivity[]>([]);
  const [stravaBikeOptions, setStravaBikeOptions] = useState<StravaBikeOption[]>([]);
  const [stravaBikeFilter, setStravaBikeFilter] = useState(STRAVA_BIKE_FILTER_ALL);
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
  const resolvedStravaBikeOptions = useMemo(() => {
    const map = new Map<string, string>();

    for (const option of stravaBikeOptions) {
      map.set(option.id, option.label);
    }

    for (const activity of preview) {
      if (!activity.gearId || map.has(activity.gearId)) {
        continue;
      }

      const fallbackName =
        typeof activity.gearName === "string" && activity.gearName.trim().length > 0
          ? activity.gearName.trim()
          : `Bike ${activity.gearId}`;

      map.set(activity.gearId, fallbackName);
    }

    if (
      stravaBikeFilter !== STRAVA_BIKE_FILTER_ALL &&
      stravaBikeFilter !== STRAVA_BIKE_FILTER_NONE &&
      !map.has(stravaBikeFilter)
    ) {
      map.set(stravaBikeFilter, `Bike ${stravaBikeFilter}`);
    }

    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [preview, stravaBikeFilter, stravaBikeOptions]);
  const stravaBikeLabelById = useMemo(
    () => new Map(resolvedStravaBikeOptions.map((option) => [option.id, option.label])),
    [resolvedStravaBikeOptions],
  );

  const hasConnection = Boolean(connection);

  useEffect(() => {
    if (!hasConnection) {
      return;
    }

    let isCancelled = false;

    async function loadBikeOptions() {
      try {
        const response = await fetch("/api/strava/bikes", {
          method: "GET",
        });

        const result = (await response.json()) as BikeOptionsResponse;
        if (!response.ok) {
          return;
        }

        if (!isCancelled) {
          setStravaBikeOptions(result.bikeOptions ?? []);
        }
      } catch {
        // Non-blocking: bike options can still load during preview.
      }
    }

    void loadBikeOptions();

    return () => {
      isCancelled = true;
    };
  }, [hasConnection]);

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
          stravaBikeFilter,
        }),
      });

      const result = (await response.json()) as PreviewResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Could not load Strava preview.");
      }

      setPreview(result.activities);
      setSelectedIds(result.activities.filter((activity) => !activity.alreadyImported).map((activity) => activity.stravaActivityId));
      setStravaBikeOptions(result.bikeOptions ?? []);
      if (typeof result.selectedBikeFilter === "string" && result.selectedBikeFilter.length > 0) {
        setStravaBikeFilter(result.selectedBikeFilter);
      }
      setSync(result.sync);
      setIsPreviewOpen(true);

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

      const importedMap = new Map(
        (result.imported ?? []).map((entry) => [entry.activityId, entry.rideId]),
      );
      const nextPreview = preview
        .map((activity) => {
          const rideId = importedMap.get(activity.stravaActivityId);
          if (!rideId) {
            return activity;
          }

          return {
            ...activity,
            alreadyImported: true,
            rideId,
          };
        })
        .filter((activity) => !activity.alreadyImported);

      setPreview(nextPreview);
      setSelectedIds((current) =>
        current.filter((activityId) => !importedMap.has(activityId)),
      );

      if (nextPreview.length === 0) {
        setIsPreviewOpen(false);
      }

      if (selectableIds.length > 0 && result.importedCount >= selectableIds.length) {
        setPreviewStatus({
          type: "success",
          message: "All previewed rides were imported. Load preview again for newer activities.",
        });
      }

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

  function closePreview() {
    setIsPreviewOpen(false);
    setPreview([]);
    setSelectedIds([]);
    setPreviewStatus({ type: "idle" });
    setConfirmStatus({ type: "idle" });
  }

  function getActivityBikeLabel(gearId: string | null) {
    if (!gearId) {
      return "No bike set";
    }

    return stravaBikeLabelById.get(gearId) ?? `Bike ${gearId}`;
  }

  if (disabled) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900">Strava import</h2>
        <p className="mt-2 text-sm text-slate-600">
          Create a bike first to enable Strava import.
        </p>
      </section>
    );
  }

  if (!hasConnection) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900">Strava import</h2>
        <p className="mt-2 text-sm text-slate-600">
          Connect your Strava account to preview recent rides and import only what you want.
        </p>

        {flashStatus === "error" ? (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {flashMessage ?? "Strava connection failed."}
          </p>
        ) : null}

        <Link
          href="/api/strava/connect?redirectTo=/rides"
          className="mt-4 inline-flex rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800"
        >
          Connect Strava
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900">Strava import</h2>
          <p className="mt-1 text-sm text-slate-600">
            Preview recent rides, then import selected activities into this bike.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="strava-bike-filter">
            Strava bike filter
          </label>
          <select
            id="strava-bike-filter"
            value={stravaBikeFilter}
            onChange={(event) => {
              setStravaBikeFilter(event.target.value);
            }}
            disabled={isPreviewLoading || isImporting}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value={STRAVA_BIKE_FILTER_ALL}>All bikes</option>
            <option value={STRAVA_BIKE_FILTER_NONE}>No bike set</option>
            {resolvedStravaBikeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>

          {isPreviewOpen ? (
            <button
              type="button"
              onClick={closePreview}
              disabled={isPreviewLoading || isImporting}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Close preview
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                void loadPreview();
              }}
              disabled={isPreviewLoading || isImporting}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPreviewLoading ? "Loading..." : "Preview recent rides"}
            </button>
          )}
        </div>
      </div>

      {flashStatus === "connected" ? (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {flashMessage ?? "Strava connected successfully."}
        </p>
      ) : null}

      {flashStatus === "error" ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {flashMessage ?? "Strava connection failed."}
        </p>
      ) : null}

      {sync ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            Status: <span className="font-semibold">{statusLabel(sync.status)}</span>
          </p>
          <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            Last sync: <span className="font-semibold">{formatDateTime(sync.lastSyncAt)}</span>
          </p>
          <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            Last imported: <span className="font-semibold">{sync.lastSyncImportedCount}</span>
          </p>
          <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            Imported total: <span className="font-semibold">{sync.totalImportedCount}</span>
          </p>
          <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            Token expires: <span className="font-semibold">{formatDateTime(sync.expiresAt)}</span>
          </p>
          <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            Scope: <span className="font-semibold">{sync.scope}</span>
          </p>
        </div>
      ) : null}

      {sync?.status === "ERROR" && sync.lastSyncError ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{sync.lastSyncError}</p>
      ) : null}

      {previewStatus.type === "success" && previewStatus.message ? (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {previewStatus.message}
        </p>
      ) : null}

      {previewStatus.type === "error" && previewStatus.message ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{previewStatus.message}</p>
      ) : null}

      {isPreviewOpen && preview.length > 0 ? (
        <div className="mt-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-700">
              {preview.length} {preview.length === 1 ? "activity" : "activities"} in preview
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds(selectableIds)}
                className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Select all new
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
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
                  className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
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
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-600"
                    />
                    <div className="min-w-0 flex-1 text-sm text-slate-700">
                      <p className="truncate font-semibold">{activity.name}</p>
                      <p className="text-xs text-slate-600">
                        {formatDateTime(activity.startedAt)} | {activity.type} | {activity.distanceMiles.toFixed(1)} mi | {formatDuration(activity.durationMinutes)}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        Suggested ride type: {activity.suggestedRideType.replaceAll("_", " ")}
                      </p>
                      <p className="mt-1 text-xs text-slate-600">
                        Strava bike: {getActivityBikeLabel(activity.gearId)}
                      </p>
                    </div>
                    {activity.alreadyImported ? (
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
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
            className="mt-4 rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isImporting ? "Importing..." : `Import selected (${selectedIds.length})`}
          </button>
        </div>
      ) : null}

      {confirmStatus.type === "success" && confirmStatus.message ? (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {confirmStatus.message}
        </p>
      ) : null}

      {confirmStatus.type === "error" && confirmStatus.message ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {confirmStatus.message}
        </p>
      ) : null}
    </section>
  );
}
