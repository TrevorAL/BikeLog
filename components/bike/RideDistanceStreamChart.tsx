"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Gauge, Route, Timer } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type RideDistanceStreamRide = {
  id: string;
  date: string;
  distanceMiles: number;
  durationMinutes: number | null;
  rideType: string | null;
  roadCondition: string | null;
  wasWet: boolean;
};

type RideDistanceStreamChartProps = {
  rides: RideDistanceStreamRide[];
};

type TimeRangeKey = "30d" | "90d" | "1y" | "all";

type RideChartDatum = {
  id: string;
  timestamp: number;
  rideNumber: number;
  shortDate: string;
  longDate: string;
  distanceMiles: number;
  rollingDistanceMiles: number;
  cumulativeMiles: number;
  durationMinutes: number | null;
  avgSpeedMph: number | null;
  rideType: string | null;
  roadCondition: string | null;
  wasWet: boolean;
};

type RideTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload: RideChartDatum }>;
};

const TIME_RANGE_OPTIONS: Array<{ key: TimeRangeKey; label: string; days: number | null }> = [
  { key: "30d", label: "30D", days: 30 },
  { key: "90d", label: "90D", days: 90 },
  { key: "1y", label: "1Y", days: 365 },
  { key: "all", label: "All", days: null },
];

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function formatRideType(rideType: string | null) {
  return rideType ? rideType.replaceAll("_", " ") : "Unknown";
}

function getCutoffTimestamp(rangeKey: TimeRangeKey, nowTimestamp: number) {
  const range = TIME_RANGE_OPTIONS.find((option) => option.key === rangeKey);
  if (!range || range.days === null) {
    return null;
  }

  return nowTimestamp - range.days * 24 * 60 * 60 * 1000;
}

function RideTooltip({ active, payload }: RideTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = payload[0]?.payload;
  if (!point) {
    return null;
  }

  return (
    <div className="w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
      <p className="text-sm font-semibold text-slate-900">{point.longDate}</p>
      <div className="mt-2 space-y-1.5 text-xs text-slate-700">
        <p>
          Distance: <span className="font-semibold">{point.distanceMiles.toFixed(1)} mi</span>
        </p>
        <p>
          5-ride trend:{" "}
          <span className="font-semibold">{point.rollingDistanceMiles.toFixed(1)} mi</span>
        </p>
        <p>
          Cumulative: <span className="font-semibold">{point.cumulativeMiles.toFixed(1)} mi</span>
        </p>
        <p>
          Duration:{" "}
          <span className="font-semibold">
            {point.durationMinutes ? `${point.durationMinutes} min` : "Not set"}
          </span>
        </p>
        <p>
          Avg speed:{" "}
          <span className="font-semibold">
            {typeof point.avgSpeedMph === "number" ? `${point.avgSpeedMph.toFixed(1)} mph` : "Not set"}
          </span>
        </p>
        <p>
          Ride type: <span className="font-semibold">{formatRideType(point.rideType)}</span>
        </p>
        <p>
          Surface: <span className="font-semibold">{point.roadCondition ?? "Not set"}</span>
          {point.wasWet ? " · Wet" : ""}
        </p>
      </div>
    </div>
  );
}

export function RideDistanceStreamChart({ rides }: RideDistanceStreamChartProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedRange, setSelectedRange] = useState<TimeRangeKey>("1y");
  const [hiddenRideTypes, setHiddenRideTypes] = useState<string[]>([]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    const updateThemeState = () => {
      setIsDarkMode(root.getAttribute("data-theme") === "dark");
    };

    updateThemeState();

    const observer = new MutationObserver(() => {
      updateThemeState();
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const normalizedRides = useMemo(() => {
    return rides
      .map((ride) => ({
        ...ride,
        timestamp: new Date(ride.date).getTime(),
        rideTypeLabel: formatRideType(ride.rideType),
      }))
      .filter((ride) => Number.isFinite(ride.timestamp))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [rides]);

  const availableRideTypes = useMemo(() => {
    return [...new Set(normalizedRides.map((ride) => ride.rideTypeLabel))].sort((a, b) =>
      a.localeCompare(b),
    );
  }, [normalizedRides]);

  const activeRideTypes = useMemo(() => {
    return availableRideTypes.filter((rideType) => !hiddenRideTypes.includes(rideType));
  }, [availableRideTypes, hiddenRideTypes]);

  const filteredRides = useMemo(() => {
    const latestRideTimestamp = normalizedRides[normalizedRides.length - 1]?.timestamp ?? 0;
    const cutoffTimestamp = getCutoffTimestamp(selectedRange, latestRideTimestamp);

    return normalizedRides.filter((ride) => {
      const passesRange = cutoffTimestamp === null || ride.timestamp >= cutoffTimestamp;
      const passesType = activeRideTypes.includes(ride.rideTypeLabel);
      return passesRange && passesType;
    });
  }, [activeRideTypes, normalizedRides, selectedRange]);

  const chartData = useMemo(() => {
    const rollingWindow = 5;
    const distances = filteredRides.map((ride) => ride.distanceMiles);
    const cumulativeByIndex = distances.reduce<number[]>((accumulator, distance, index) => {
      const previousCumulative = index > 0 ? accumulator[index - 1] : 0;
      accumulator.push(previousCumulative + distance);
      return accumulator;
    }, []);

    return filteredRides.map((ride, index) => {
      const startIndex = Math.max(0, index - (rollingWindow - 1));
      const rollingSlice = distances.slice(startIndex, index + 1);
      const rollingDistanceMiles =
        rollingSlice.reduce((sum, miles) => sum + miles, 0) / rollingSlice.length;
      const avgSpeedMph =
        ride.durationMinutes && ride.durationMinutes > 0
          ? ride.distanceMiles / (ride.durationMinutes / 60)
          : null;

      return {
        id: ride.id,
        timestamp: ride.timestamp,
        rideNumber: index + 1,
        shortDate: shortDateFormatter.format(ride.timestamp),
        longDate: longDateFormatter.format(ride.timestamp),
        distanceMiles: ride.distanceMiles,
        rollingDistanceMiles,
        cumulativeMiles: cumulativeByIndex[index] ?? ride.distanceMiles,
        durationMinutes: ride.durationMinutes,
        avgSpeedMph,
        rideType: ride.rideType,
        roadCondition: ride.roadCondition,
        wasWet: ride.wasWet,
      } satisfies RideChartDatum;
    });
  }, [filteredRides]);

  const summary = useMemo(() => {
    if (chartData.length === 0) {
      return {
        totalRides: 0,
        totalMiles: 0,
        averageRideMiles: 0,
        longestRideMiles: 0,
        averageSpeedMph: null as number | null,
      };
    }

    const totalMiles = chartData.reduce((sum, ride) => sum + ride.distanceMiles, 0);
    const averageRideMiles = totalMiles / chartData.length;
    const longestRideMiles = Math.max(...chartData.map((ride) => ride.distanceMiles));
    const speedSamples = chartData
      .map((ride) => ride.avgSpeedMph)
      .filter((value): value is number => typeof value === "number");

    return {
      totalRides: chartData.length,
      totalMiles,
      averageRideMiles,
      longestRideMiles,
      averageSpeedMph:
        speedSamples.length > 0
          ? speedSamples.reduce((sum, speed) => sum + speed, 0) / speedSamples.length
          : null,
    };
  }, [chartData]);

  const cumulativeSeriesColor = isDarkMode ? "#ffffff" : "#0f172a";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900">
            Ride Distance Stream
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Hover the chart to inspect each ride, trend movement, and cumulative mileage.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
              Time range
            </p>
            {TIME_RANGE_OPTIONS.map((option) => {
              const active = selectedRange === option.key;

              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSelectedRange(option.key)}
                  className={
                    active
                      ? "rounded-md border border-sky-700 bg-sky-700 px-2.5 py-1 text-xs font-semibold text-white"
                      : "rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  }
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-600">
            Showing <span className="font-semibold text-slate-800">{chartData.length}</span> ride
            {chartData.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="mt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
              Ride type filters
            </p>
            <button
              type="button"
              onClick={() => setHiddenRideTypes([])}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              All types
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {availableRideTypes.length > 0 ? (
              availableRideTypes.map((rideType) => {
                const active = activeRideTypes.includes(rideType);

                return (
                  <button
                    key={rideType}
                    type="button"
                    onClick={() => {
                      setHiddenRideTypes((previous) => {
                        if (previous.includes(rideType)) {
                          return previous.filter((value) => value !== rideType);
                        }
                        return [...previous, rideType];
                      });
                    }}
                    className={
                      active
                        ? "rounded-md border border-emerald-300 bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800"
                        : "rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                    }
                  >
                    {rideType}
                  </button>
                );
              })
            ) : (
              <p className="text-xs text-slate-500">No ride types available yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total rides</p>
          <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-slate-900">
            <Activity className="h-4 w-4 text-sky-700" />
            {summary.totalRides}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total distance</p>
          <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-slate-900">
            <Route className="h-4 w-4 text-sky-700" />
            {summary.totalMiles.toFixed(1)} mi
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">Average ride</p>
          <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-slate-900">
            <Timer className="h-4 w-4 text-sky-700" />
            {summary.averageRideMiles.toFixed(1)} mi
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">Longest ride</p>
          <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-slate-900">
            <Gauge className="h-4 w-4 text-sky-700" />
            {summary.longestRideMiles.toFixed(1)} mi
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">Average speed</p>
          <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-slate-900">
            <Gauge className="h-4 w-4 text-sky-700" />
            {typeof summary.averageSpeedMph === "number"
              ? `${summary.averageSpeedMph.toFixed(1)} mph`
              : "Not set"}
          </p>
        </div>
      </div>

      <div className="mt-4 h-[420px] rounded-xl border border-slate-100 bg-slate-50 p-3">
        {chartData.length > 1 ? (
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={300}
            initialDimension={{ width: 880, height: 300 }}
          >
            <AreaChart data={chartData} margin={{ top: 16, right: 24, left: 8, bottom: 12 }}>
              <defs>
                <linearGradient id="ride-distance-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#cbd5e1" strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="timestamp"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(value) => shortDateFormatter.format(Number(value))}
                minTickGap={24}
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#cbd5e1" }}
              />
              <YAxis
                yAxisId="distance"
                tickFormatter={(value) => `${value}`}
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#cbd5e1" }}
                width={44}
              />
              <YAxis
                yAxisId="cumulative"
                orientation="right"
                tickFormatter={(value) => `${Math.round(value)}`}
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#cbd5e1" }}
                width={52}
              />
              <Tooltip
                content={<RideTooltip />}
                cursor={{ stroke: "#0f172a", strokeDasharray: "4 4", strokeWidth: 1 }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ fontSize: "12px", color: isDarkMode ? "#cbd5e1" : "#334155" }}
                formatter={(value) => {
                  const label = String(value);
                  const color =
                    label === "Cumulative Miles"
                      ? cumulativeSeriesColor
                      : isDarkMode
                        ? "#cbd5e1"
                        : "#334155";
                  return <span style={{ color }}>{label}</span>;
                }}
              />
              <Area
                yAxisId="distance"
                type="monotone"
                dataKey="distanceMiles"
                name="Ride Distance (mi)"
                stroke="#0284c7"
                strokeWidth={2.4}
                fill="url(#ride-distance-fill)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, fill: "#ffffff" }}
              />
              <Line
                yAxisId="distance"
                type="monotone"
                dataKey="rollingDistanceMiles"
                name="5-Ride Trend (mi)"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
                strokeDasharray="6 4"
                activeDot={false}
              />
              <Line
                yAxisId="cumulative"
                type="monotone"
                dataKey="cumulativeMiles"
                name="Cumulative Miles"
                stroke={cumulativeSeriesColor}
                strokeWidth={1.8}
                dot={false}
                activeDot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-slate-600">
            No rides match your current filters. Adjust the range or ride types.
          </p>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Left axis: per-ride distance and trend. Right axis: cumulative distance over time.
      </p>
    </section>
  );
}
