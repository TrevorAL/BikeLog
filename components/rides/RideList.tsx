"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ROAD_CONDITIONS, RIDE_TYPES } from "@/lib/ride-options";
import { RideCard } from "@/components/rides/RideCard";

type RideListItem = {
  id: string;
  date: string;
  distanceMiles: number;
  durationMinutes: number | null;
  rideType: string;
  weather: string | null;
  roadCondition: string | null;
  wasWet: boolean;
  notes: string | null;
};

type RideListProps = {
  rides: RideListItem[];
};

type FormStatus = {
  type: "idle" | "success" | "error";
  message?: string;
  suggestions?: string[];
};

type RideDetailsStravaStreams = {
  time: Array<number | null>;
  distance: Array<number | null>;
  altitude: Array<number | null>;
  velocitySmooth: Array<number | null>;
  gradeSmooth: Array<number | null>;
  heartRate: Array<number | null>;
  cadence: Array<number | null>;
  watts: Array<number | null>;
  temperature: Array<number | null>;
  moving: Array<number | null>;
  latLng: Array<{ lat: number; lng: number }>;
};

type RideDetailsResponse = {
  ride: {
    id: string;
    date: string;
    distanceMiles: number;
    durationMinutes: number | null;
    rideType: string;
    weather: string | null;
    roadCondition: string | null;
    wasWet: boolean;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    stravaImport:
      | {
          stravaActivityId: string;
          activityName: string | null;
          activityType: string | null;
          startedAt: string;
          distanceMeters: number | null;
          movingTimeSeconds: number | null;
          importedAt: string;
        }
      | null;
  };
  strava: {
    imported: boolean;
    stravaActivityId: string | null;
    detail:
      | {
          id: string;
          name: string;
          type: string | null;
          startDate: string | null;
          startDateLocal: string | null;
          distanceMeters: number | null;
          distanceMiles: number | null;
          movingTimeSeconds: number | null;
          elapsedTimeSeconds: number | null;
          totalElevationGainMeters: number | null;
          totalElevationGainFeet: number | null;
          elevHighMeters: number | null;
          elevLowMeters: number | null;
          averageSpeedMetersPerSecond: number | null;
          averageSpeedMph: number | null;
          maxSpeedMetersPerSecond: number | null;
          maxSpeedMph: number | null;
          averageCadence: number | null;
          averageWatts: number | null;
          weightedAverageWatts: number | null;
          maxWatts: number | null;
          averageHeartrate: number | null;
          maxHeartrate: number | null;
          calories: number | null;
          kilojoules: number | null;
          sufferScore: number | null;
          kudosCount: number | null;
          commentCount: number | null;
          achievementCount: number | null;
          deviceWatts: boolean | null;
          trainer: boolean;
          commute: boolean;
          mapSummaryPolyline: string | null;
          mapPolyline: string | null;
        }
      | null;
    streams: RideDetailsStravaStreams | null;
    error: string | null;
  };
  error?: string;
};

type RideStreamPoint = {
  xValue: number;
  timeMinutes: number | null;
  distanceMiles: number | null;
  speedMph: number | null;
  altitudeFeet: number | null;
  heartRate: number | null;
  cadence: number | null;
  watts: number | null;
  gradePercent: number | null;
  temperatureF: number | null;
  moving: number | null;
};

type RideStreamTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload: RideStreamPoint }>;
};

const STREAM_POINT_LIMIT = 700;

const RideTraceMapLeaflet = dynamic(
  () =>
    import("@/components/rides/RideTraceMapLeaflet").then(
      (module) => module.RideTraceMapLeaflet,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-56 w-full rounded-md border border-slate-200 bg-slate-100 animate-pulse" />
    ),
  },
);

function parseOptionalText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toDateInputValue(dateInput: string) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function formatRideType(value: string | null | undefined) {
  if (!value) {
    return "Unknown";
  }

  return value.replaceAll("_", " ");
}

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

function formatDurationFromMinutes(minutes: number | null | undefined) {
  if (!minutes || minutes <= 0) {
    return "-";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function formatDurationFromSeconds(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) {
    return "-";
  }

  if (seconds < 3600) {
    return `${Math.round(seconds / 60)} min`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function formatDecimal(value: number | null | undefined, digits = 1) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return value.toFixed(digits);
}

function metersToMiles(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value / 1609.344;
}

function metersToFeet(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value * 3.2808398950131;
}

function metersPerSecondToMph(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value * 2.2369362920544;
}

function celsiusToFahrenheit(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value * 1.8 + 32;
}

function downsampleStreamPoints(points: RideStreamPoint[]) {
  if (points.length <= STREAM_POINT_LIMIT) {
    return points;
  }

  const stride = Math.ceil(points.length / STREAM_POINT_LIMIT);
  return points.filter((_, index) => index % stride === 0 || index === points.length - 1);
}

function buildRideStreamPoints(streams: RideDetailsStravaStreams) {
  const maxLength = Math.max(
    streams.time.length,
    streams.distance.length,
    streams.altitude.length,
    streams.velocitySmooth.length,
    streams.heartRate.length,
    streams.cadence.length,
    streams.watts.length,
    streams.gradeSmooth.length,
    streams.temperature.length,
    streams.moving.length,
  );

  if (maxLength === 0) {
    return [] as RideStreamPoint[];
  }

  const points: RideStreamPoint[] = [];

  for (let index = 0; index < maxLength; index += 1) {
    const timeSeconds = streams.time[index];
    const distanceMeters = streams.distance[index];
    const altitudeMeters = streams.altitude[index];
    const speedMetersPerSecond = streams.velocitySmooth[index];
    const heartRate = streams.heartRate[index];
    const cadence = streams.cadence[index];
    const watts = streams.watts[index];
    const gradePercent = streams.gradeSmooth[index];
    const temperatureC = streams.temperature[index];
    const moving = streams.moving[index];

    const timeMinutes =
      typeof timeSeconds === "number" && Number.isFinite(timeSeconds)
        ? timeSeconds / 60
        : null;
    const distanceMiles =
      typeof distanceMeters === "number" && Number.isFinite(distanceMeters)
        ? metersToMiles(distanceMeters)
        : null;

    const hasAnyValue = [
      timeMinutes,
      distanceMiles,
      altitudeMeters,
      speedMetersPerSecond,
      heartRate,
      cadence,
      watts,
      gradePercent,
      temperatureC,
      moving,
    ].some((value) => typeof value === "number" && Number.isFinite(value));

    if (!hasAnyValue) {
      continue;
    }

    points.push({
      xValue: timeMinutes ?? distanceMiles ?? index,
      timeMinutes,
      distanceMiles,
      speedMph: metersPerSecondToMph(speedMetersPerSecond),
      altitudeFeet: metersToFeet(altitudeMeters),
      heartRate: typeof heartRate === "number" && Number.isFinite(heartRate) ? heartRate : null,
      cadence: typeof cadence === "number" && Number.isFinite(cadence) ? cadence : null,
      watts: typeof watts === "number" && Number.isFinite(watts) ? watts : null,
      gradePercent:
        typeof gradePercent === "number" && Number.isFinite(gradePercent)
          ? gradePercent
          : null,
      temperatureF: celsiusToFahrenheit(temperatureC),
      moving: typeof moving === "number" && Number.isFinite(moving) ? moving : null,
    });
  }

  return downsampleStreamPoints(points);
}

type LatLngPoint = {
  lat: number;
  lng: number;
};

function decodePolyline(polyline: string) {
  const points: LatLngPoint[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < polyline.length) {
    let result = 0;
    let shift = 0;
    let byte = 0;

    do {
      byte = polyline.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    result = 0;
    shift = 0;

    do {
      byte = polyline.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    points.push({
      lat: lat / 1e5,
      lng: lng / 1e5,
    });
  }

  return points;
}

function RideStreamTooltip({ active, payload }: RideStreamTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = payload[0]?.payload;
  if (!point) {
    return null;
  }

  return (
    <div className="w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
      <p className="text-sm font-semibold text-slate-900">Strava stream sample</p>
      <div className="mt-2 space-y-1.5 text-xs text-slate-700">
        <p>
          Elapsed: <span className="font-semibold">{formatDecimal(point.timeMinutes, 1)} min</span>
        </p>
        <p>
          Distance: <span className="font-semibold">{formatDecimal(point.distanceMiles, 2)} mi</span>
        </p>
        <p>
          Speed: <span className="font-semibold">{formatDecimal(point.speedMph, 1)} mph</span>
        </p>
        <p>
          Elevation: <span className="font-semibold">{formatDecimal(point.altitudeFeet, 0)} ft</span>
        </p>
        <p>
          Heart rate: <span className="font-semibold">{formatDecimal(point.heartRate, 0)} bpm</span>
        </p>
        <p>
          Cadence: <span className="font-semibold">{formatDecimal(point.cadence, 0)} rpm</span>
        </p>
        <p>
          Power: <span className="font-semibold">{formatDecimal(point.watts, 0)} W</span>
        </p>
        <p>
          Grade: <span className="font-semibold">{formatDecimal(point.gradePercent, 1)}%</span>
        </p>
        <p>
          Temp: <span className="font-semibold">{formatDecimal(point.temperatureF, 0)} F</span>
        </p>
      </div>
    </div>
  );
}

function RideStreamChart({ streams }: { streams: RideDetailsStravaStreams }) {
  const data = useMemo(() => buildRideStreamPoints(streams), [streams]);

  const xMode = useMemo(() => {
    if (data.some((point) => typeof point.timeMinutes === "number")) {
      return "time" as const;
    }

    if (data.some((point) => typeof point.distanceMiles === "number")) {
      return "distance" as const;
    }

    return "index" as const;
  }, [data]);

  const hasHeartRate = data.some((point) => typeof point.heartRate === "number");
  const hasCadence = data.some((point) => typeof point.cadence === "number");
  const hasWatts = data.some((point) => typeof point.watts === "number");
  const hasAltitude = data.some((point) => typeof point.altitudeFeet === "number");

  const altitudeDomain = useMemo(() => {
    const samples = data
      .map((point) => point.altitudeFeet)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

    if (samples.length === 0) {
      return [0, 100] as [number, number];
    }

    let min = Math.min(...samples);
    let max = Math.max(...samples);

    if (max - min < 25) {
      const center = (max + min) / 2;
      min = center - 20;
      max = center + 20;
    } else {
      const padding = (max - min) * 0.08;
      min -= padding;
      max += padding;
    }

    return [Math.floor(min), Math.ceil(max)] as [number, number];
  }, [data]);

  if (data.length < 2) {
    return (
      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        Strava stream data is not available for this ride.
      </p>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900">Strava ride stream</h4>
        <p className="text-xs text-slate-600">
          Hover to inspect the ride trace ({data.length} points)
        </p>
      </div>

      <div className="mt-3 h-72 w-full rounded-lg border border-slate-200 bg-white p-2">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
          <ComposedChart data={data} margin={{ top: 8, right: 18, left: 8, bottom: 8 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="xValue"
              tick={{ fontSize: 11, fill: "#475569" }}
              tickLine={{ stroke: "#cbd5e1" }}
              axisLine={{ stroke: "#cbd5e1" }}
              tickFormatter={(value) => {
                if (typeof value !== "number") {
                  return "";
                }

                if (xMode === "time") {
                  return `${value.toFixed(0)}m`;
                }

                if (xMode === "distance") {
                  return `${value.toFixed(1)}mi`;
                }

                return `${Math.round(value)}`;
              }}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: "#475569" }}
              tickLine={{ stroke: "#cbd5e1" }}
              axisLine={{ stroke: "#cbd5e1" }}
              tickFormatter={(value) =>
                typeof value === "number" ? `${Math.round(value)}` : ""
              }
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={altitudeDomain}
              tick={{ fontSize: 11, fill: "#475569" }}
              tickLine={{ stroke: "#cbd5e1" }}
              axisLine={{ stroke: "#cbd5e1" }}
              tickFormatter={(value) =>
                typeof value === "number" ? `${Math.round(value)}ft` : ""
              }
            />
            <Tooltip
              content={<RideStreamTooltip />}
              cursor={{ stroke: "#0284c7", strokeDasharray: "4 4" }}
            />
            {hasAltitude ? (
              <>
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="altitudeFeet"
                  stroke="#f59e0b"
                  fill="#fef3c7"
                  fillOpacity={0.55}
                  connectNulls
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="altitudeFeet"
                  stroke="#d97706"
                  strokeWidth={1.4}
                  dot={false}
                  connectNulls
                />
              </>
            ) : null}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="speedMph"
              stroke="#0284c7"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            {hasHeartRate ? (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="heartRate"
                stroke="#ef4444"
                strokeWidth={1.5}
                dot={false}
                connectNulls
              />
            ) : null}
            {hasCadence ? (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="cadence"
                stroke="#10b981"
                strokeWidth={1.5}
                dot={false}
                connectNulls
              />
            ) : null}
            {hasWatts ? (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="watts"
                stroke="#8b5cf6"
                strokeWidth={1.5}
                dot={false}
                connectNulls
              />
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-sky-600" /> Speed
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> Elevation
        </span>
        {hasHeartRate ? (
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" /> HR
          </span>
        ) : null}
        {hasCadence ? (
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Cadence
          </span>
        ) : null}
        {hasWatts ? (
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-violet-500" /> Power
          </span>
        ) : null}
      </div>
    </section>
  );
}

function RideTraceMap({ points }: { points: LatLngPoint[] }) {
  if (points.length < 2) {
    return (
      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        Strava map trace is not available for this ride.
      </p>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900">Route trace</h4>
        <p className="text-xs text-slate-600">{points.length} points</p>
      </div>
      <div className="mt-3 rounded-lg border border-slate-200 bg-white p-2">
        <RideTraceMapLeaflet points={points} />
      </div>
      <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-600">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" /> Start
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500" /> Finish
        </span>
      </div>
    </section>
  );
}

function RideDetailsModal({
  ride,
  open,
  loading,
  error,
  details,
  onClose,
}: {
  ride: RideListItem;
  open: boolean;
  loading: boolean;
  error: string | null;
  details: RideDetailsResponse | null;
  onClose: () => void;
}) {
  const detail = details?.strava.detail ?? null;
  const streams = details?.strava.streams ?? null;
  const mapPoints = (() => {
    if (streams?.latLng && streams.latLng.length > 1) {
      return streams.latLng;
    }

    const encodedPolyline = detail?.mapPolyline ?? detail?.mapSummaryPolyline;
    if (typeof encodedPolyline === "string" && encodedPolyline.trim().length > 0) {
      return decodePolyline(encodedPolyline.trim());
    }

    return [] as LatLngPoint[];
  })();

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={`ride-details-title-${ride.id}`}
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id={`ride-details-title-${ride.id}`} className="font-display text-xl font-semibold text-slate-900">
              Ride details
            </h3>
            <p className="text-sm text-slate-600">{formatDateTime(ride.date)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        {loading ? (
          <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Loading ride details...
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
        ) : null}

        {!loading && !error ? (
          <>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Distance</p>
                <p className="text-sm font-semibold text-slate-900">{ride.distanceMiles.toFixed(2)} mi</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Duration</p>
                <p className="text-sm font-semibold text-slate-900">
                  {formatDurationFromMinutes(ride.durationMinutes)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Ride type</p>
                <p className="text-sm font-semibold text-slate-900">{formatRideType(ride.rideType)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Road condition</p>
                <p className="text-sm font-semibold text-slate-900">{ride.roadCondition ?? "Unknown"}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Weather</p>
                <p className="text-sm font-semibold text-slate-900">{ride.weather ?? "Not set"}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Wet ride</p>
                <p className="text-sm font-semibold text-slate-900">{ride.wasWet ? "Yes" : "No"}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Created</p>
                <p className="text-sm font-semibold text-slate-900">
                  {formatDateTime(details?.ride.createdAt)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Updated</p>
                <p className="text-sm font-semibold text-slate-900">
                  {formatDateTime(details?.ride.updatedAt)}
                </p>
              </div>
            </div>

            {ride.notes ? (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-xs text-slate-500">Notes</p>
                <p className="text-sm text-slate-700">{ride.notes}</p>
              </div>
            ) : null}

            {details?.strava.imported ? (
              <div className="mt-5 space-y-3">
                <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
                  Linked Strava activity: {details.strava.stravaActivityId}
                  {details.strava.error ? ` (limited: ${details.strava.error})` : ""}
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">Strava name</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {detail?.name ?? details.ride.stravaImport?.activityName ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">Strava type</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {detail?.type ?? details.ride.stravaImport?.activityType ?? "-"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">Start time</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatDateTime(detail?.startDateLocal ?? details.ride.stravaImport?.startedAt)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">Imported</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatDateTime(details.ride.stravaImport?.importedAt)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">Moving time</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatDurationFromSeconds(detail?.movingTimeSeconds)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">Elapsed time</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatDurationFromSeconds(detail?.elapsedTimeSeconds)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">Average speed</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatDecimal(detail?.averageSpeedMph, 1)} mph
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">Max speed</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatDecimal(detail?.maxSpeedMph, 1)} mph
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">Elevation gain</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatDecimal(detail?.totalElevationGainFeet, 0)} ft
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">Avg heart rate</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatDecimal(detail?.averageHeartrate, 0)} bpm
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">Avg cadence</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatDecimal(detail?.averageCadence, 0)} rpm
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">Avg power</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatDecimal(detail?.averageWatts, 0)} W
                    </p>
                  </div>
                </div>

                <RideTraceMap points={mapPoints} />
                {streams ? <RideStreamChart streams={streams} /> : null}
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                This ride is not linked to Strava. You still have full local ride details above.
              </p>
            )}
          </>
        ) : null}
      </section>
    </div>
  );
}

function EditableRideCard({ ride }: { ride: RideListItem }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<FormStatus>({ type: "idle" });
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [details, setDetails] = useState<RideDetailsResponse | null>(null);

  const isBusy = isSubmitting;

  async function openRideDetails() {
    if (isBusy) {
      return;
    }

    setIsDetailsOpen(true);
    if (detailsLoading) {
      return;
    }

    setDetailsError(null);
    setDetailsLoading(true);

    try {
      const response = await fetch(`/api/rides/${ride.id}`, {
        method: "GET",
      });

      const result = (await response.json()) as RideDetailsResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Could not load ride details.");
      }

      setDetails(result);
    } catch (error) {
      setDetailsError(
        error instanceof Error ? error.message : "Could not load ride details right now.",
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  return isEditing ? (
    <form
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        setIsSubmitting(true);
        setStatus({ type: "idle" });

        try {
          const distanceMiles = Number(formData.get("distanceMiles"));
          const durationValue = formData.get("durationMinutes");
          const durationMinutes =
            typeof durationValue === "string" && durationValue.length > 0
              ? Number(durationValue)
              : undefined;

          const response = await fetch(`/api/rides/${ride.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              date: formData.get("date"),
              distanceMiles,
              durationMinutes,
              rideType: formData.get("rideType"),
              weather: parseOptionalText(formData.get("weather")),
              roadCondition: parseOptionalText(formData.get("roadCondition")),
              wasWet: formData.get("wasWet") === "on",
              notes: parseOptionalText(formData.get("notes")),
            }),
          });

          const result = (await response.json()) as {
            error?: string;
            suggestions?: string[];
          };

          if (!response.ok) {
            throw new Error(result.error ?? "Could not update ride.");
          }

          setStatus({
            type: "success",
            message: "Ride updated. Mileage adjusted.",
            suggestions: result.suggestions,
          });

          setDetails(null);
          setIsEditing(false);
          router.refresh();
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Could not update ride right now.";

          setStatus({
            type: "error",
            message,
          });
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold text-slate-900">Edit ride</h3>
        <button
          type="button"
          onClick={() => {
            setIsEditing(false);
            setStatus({ type: "idle" });
          }}
          className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-slate-700">
          Date
          <input
            name="date"
            type="date"
            defaultValue={toDateInputValue(ride.date)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            required
          />
        </label>
        <label className="text-sm text-slate-700">
          Distance (mi)
          <input
            name="distanceMiles"
            type="number"
            min="0.1"
            step="0.1"
            defaultValue={ride.distanceMiles}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            required
          />
        </label>
        <label className="text-sm text-slate-700">
          Duration (minutes)
          <input
            name="durationMinutes"
            type="number"
            min="0"
            defaultValue={ride.durationMinutes ?? ""}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="text-sm text-slate-700">
          Ride type
          <select
            name="rideType"
            defaultValue={ride.rideType}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
          >
            {RIDE_TYPES.map((rideType) => (
              <option key={rideType} value={rideType}>
                {rideType.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-700">
          Weather
          <input
            name="weather"
            type="text"
            defaultValue={ride.weather ?? ""}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="text-sm text-slate-700">
          Road condition
          <select
            name="roadCondition"
            defaultValue={ride.roadCondition ?? "Normal"}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
          >
            {ROAD_CONDITIONS.map((condition) => (
              <option key={condition} value={condition}>
                {condition}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 pt-6 text-sm text-slate-700">
          <input
            name="wasWet"
            type="checkbox"
            defaultChecked={ride.wasWet}
            className="h-4 w-4 rounded border-slate-300 text-slate-600"
          />
          Ride was wet
        </label>
      </div>

      <label className="mt-3 block text-sm text-slate-700">
        Notes
        <textarea
          name="notes"
          defaultValue={ride.notes ?? ""}
          className="mt-1 h-20 w-full rounded-xl border border-slate-200 px-3 py-2"
        />
      </label>

      <button
        type="submit"
        disabled={isBusy}
        className="mt-4 rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isBusy ? "Saving..." : "Save changes"}
      </button>

      {status.type === "error" && status.message ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{status.message}</p>
      ) : null}
    </form>
  ) : (
    <div>
      <RideCard
        date={ride.date}
        distanceMiles={ride.distanceMiles}
        durationMinutes={ride.durationMinutes}
        rideType={ride.rideType}
        weather={ride.weather}
        roadCondition={ride.roadCondition}
        wasWet={ride.wasWet}
        notes={ride.notes}
        onClick={() => {
          void openRideDetails();
        }}
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setIsEditing(true);
                setStatus({ type: "idle" });
              }}
              disabled={isBusy}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={async () => {
                const shouldDelete = window.confirm(
                  "Delete this ride? This will also decrement component mileage.",
                );

                if (!shouldDelete) {
                  return;
                }

                setIsSubmitting(true);
                setStatus({ type: "idle" });

                try {
                  const response = await fetch(`/api/rides/${ride.id}`, {
                    method: "DELETE",
                  });

                  const result = (await response.json()) as { error?: string };

                  if (!response.ok) {
                    throw new Error(result.error ?? "Could not delete ride.");
                  }

                  setStatus({
                    type: "success",
                    message: "Ride deleted. Mileage adjusted.",
                  });
                  router.refresh();
                } catch (error) {
                  const message =
                    error instanceof Error ? error.message : "Could not delete ride right now.";

                  setStatus({
                    type: "error",
                    message,
                  });
                } finally {
                  setIsSubmitting(false);
                }
              }}
              disabled={isBusy}
              className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBusy ? "Working..." : "Delete"}
            </button>
          </div>
        }
      />

      <RideDetailsModal
        ride={ride}
        open={isDetailsOpen}
        loading={detailsLoading}
        error={detailsError}
        details={details}
        onClose={() => {
          setIsDetailsOpen(false);
        }}
      />

      {status.type === "error" && status.message ? (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{status.message}</p>
      ) : null}

      {status.type === "success" && status.message ? (
        <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {status.message}
        </p>
      ) : null}

      {status.type === "success" && status.suggestions && status.suggestions.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {status.suggestions.map((suggestion) => (
            <li
              key={suggestion}
              className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600"
            >
              {suggestion}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function RideList({ rides }: RideListProps) {
  return (
    <div>
      <p className="mb-3 text-xs font-medium text-slate-600">Click any ride card to view full details.</p>
      <div className="grid gap-3 xl:grid-cols-2">
        {rides.map((ride) => (
          <EditableRideCard key={ride.id} ride={ride} />
        ))}
      </div>
    </div>
  );
}
