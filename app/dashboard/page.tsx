import Link from "next/link";
import type { ComponentType } from "@prisma/client";
import { Activity, Gauge, ShieldCheck, Wrench } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/ui/MetricCard";
import { QuickActionsDropdown } from "@/components/ui/QuickActionsDropdown";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { OrbitDial } from "@/components/ui/viz/OrbitDial";
import { PillBars } from "@/components/ui/viz/PillBars";
import { requireServerUser } from "@/lib/auth";
import { computeBikeMaintenance } from "@/lib/bike-maintenance";
import { MAINTENANCE_INTERVALS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { getOwnedBikeId } from "@/lib/ownership";
import { calculatePressure } from "@/lib/pressure";

export const dynamic = "force-dynamic";

const componentMaintenanceRuleByType: Partial<
  Record<ComponentType, { key: string; intervalMiles: number }>
> = {
  CHAIN: {
    key: "chain-lube",
    intervalMiles: MAINTENANCE_INTERVALS.chainLube.intervalMiles,
  },
  CASSETTE: {
    key: "cassette-inspect",
    intervalMiles: MAINTENANCE_INTERVALS.cassetteInspection.intervalMiles,
  },
  FRONT_TIRE: {
    key: "tire-inspect",
    intervalMiles: MAINTENANCE_INTERVALS.tireInspection.intervalMiles,
  },
  REAR_TIRE: {
    key: "tire-inspect",
    intervalMiles: MAINTENANCE_INTERVALS.tireInspection.intervalMiles,
  },
  FRONT_BRAKE_PAD: {
    key: "brake-inspect",
    intervalMiles: MAINTENANCE_INTERVALS.brakePadInspection.intervalMiles,
  },
  REAR_BRAKE_PAD: {
    key: "brake-inspect",
    intervalMiles: MAINTENANCE_INTERVALS.brakePadInspection.intervalMiles,
  },
  FRONT_ROTOR: {
    key: "rotor-inspect",
    intervalMiles: MAINTENANCE_INTERVALS.rotorInspection.intervalMiles,
  },
  REAR_ROTOR: {
    key: "rotor-inspect",
    intervalMiles: MAINTENANCE_INTERVALS.rotorInspection.intervalMiles,
  },
  CHAINRINGS: {
    key: "chain-wear",
    intervalMiles: MAINTENANCE_INTERVALS.chainWear.intervalMiles,
  },
  CLEATS: {
    key: "cleat-inspect",
    intervalMiles: MAINTENANCE_INTERVALS.cleatInspection.intervalMiles,
  },
  BAR_TAPE: {
    key: "bar-tape-inspect",
    intervalMiles: MAINTENANCE_INTERVALS.barTapeInspection.intervalMiles,
  },
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function getProgressToService(input: {
  detail: string;
  intervalMiles: number;
  status: "GOOD" | "DUE_SOON" | "DUE_NOW" | "OVERDUE";
}) {
  if (input.detail.toLowerCase() === "due now") {
    return 100;
  }

  const remainingMatch = input.detail.match(/^([0-9]+(?:\.[0-9]+)?) miles remaining$/i);
  if (remainingMatch) {
    const milesRemaining = Number(remainingMatch[1]);
    return clampPercent(((input.intervalMiles - milesRemaining) / input.intervalMiles) * 100);
  }

  const overdueMatch = input.detail.match(/^([0-9]+(?:\.[0-9]+)?) miles overdue$/i);
  if (overdueMatch) {
    return 100;
  }

  if (input.status === "DUE_NOW" || input.status === "OVERDUE") {
    return 100;
  }

  if (input.status === "DUE_SOON") {
    return 85;
  }

  return 0;
}

async function getDashboardData(userId: string) {
  try {
    const bikeId = await getOwnedBikeId({ userId });
    if (!bikeId) {
      return {
        bike: undefined,
        dbConnected: true,
      };
    }

    const bike = await prisma.bike.findUnique({
      where: {
        id: bikeId,
      },
      select: {
        id: true,
        name: true,
        rides: {
          select: {
            id: true,
            distanceMiles: true,
            durationMinutes: true,
            date: true,
            wasWet: true,
            roadCondition: true,
            rideType: true,
          },
          orderBy: {
            date: "desc",
          },
        },
        components: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            type: true,
            currentMileage: true,
          },
        },
        maintenanceEvents: {
          select: {
            type: true,
            date: true,
            mileageAtService: true,
            notes: true,
          },
          orderBy: {
            date: "desc",
          },
        },
        pressureSetups: {
          orderBy: {
            updatedAt: "desc",
          },
          take: 1,
          select: {
            frontPsi: true,
            rearPsi: true,
          },
        },
      },
    });

    if (!bike) {
      return {
        bike: undefined,
        dbConnected: true,
      };
    }

    const maintenance = computeBikeMaintenance({
      rides: bike.rides,
      components: bike.components,
      maintenanceEvents: bike.maintenanceEvents,
    });

    const fallbackPressure = calculatePressure({
      riderWeightLbs: 165,
      bikeWeightLbs: 18,
      gearWeightLbs: 4,
      frontTireWidthMm: 25,
      rearTireWidthMm: 25,
      tubeless: false,
      surface: "normal",
      preference: "balanced",
    });

    const pressureRecommendation = bike.pressureSetups[0]
      ? {
          frontPsi: Math.round(bike.pressureSetups[0].frontPsi),
          rearPsi: Math.round(bike.pressureSetups[0].rearPsi),
        }
      : fallbackPressure;

    return {
      bike,
      maintenance,
      pressureRecommendation,
      dbConnected: true,
    };
  } catch {
    return {
      bike: undefined,
      dbConnected: false,
    };
  }
}

export default async function DashboardPage() {
  const user = await requireServerUser();
  const data = await getDashboardData(user.id);
  const bike = data.bike;

  const bikeMileage = bike ? data.maintenance.bikeMileage : 0;
  const dueNowCount = bike ? data.maintenance.maintenanceSummary.dueNow.length : 0;
  const dueSoonCount = bike ? data.maintenance.maintenanceSummary.dueSoon.length : 0;
  const dueNowItems = bike ? data.maintenance.maintenanceSummary.dueNow : [];
  const dueSoonItems = bike ? data.maintenance.maintenanceSummary.dueSoon : [];
  const readinessReasons = bike ? data.maintenance.readiness.reasons : [];
  const recentRides = bike ? bike.rides.slice(0, 5) : [];
  const dueItemMap = new Map(
    bike ? data.maintenance.maintenanceSummary.dueItems.map((item) => [item.key, item] as const) : [],
  );
  const componentMileageBars = bike
    ? [...bike.components]
        .map((component) => {
          const maintenanceRule = componentMaintenanceRuleByType[component.type];
          if (!maintenanceRule) {
            return null;
          }

          const dueItem = dueItemMap.get(maintenanceRule.key);
          if (!dueItem) {
            return null;
          }

          return {
            label: component.name,
            value: getProgressToService({
              detail: dueItem.detail,
              intervalMiles: maintenanceRule.intervalMiles,
              status: dueItem.status,
            }),
            hint: dueItem.detail,
          };
        })
        .filter(
          (bar): bar is { label: string; value: number; hint: string } =>
            Boolean(bar),
        )
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)
    : [];
  const quickActions = [
    { href: "/rides?open=log#ride-log-form", label: "Log Ride" },
    { href: "/maintenance#maintenance-log-form", label: "Log Maintenance" },
    { href: "/maintenance?due=chain-lube#maintenance-log-form", label: "Lube Chain" },
    { href: "/maintenance?due=di2-charge#maintenance-log-form", label: "Charge Di2" },
    { href: "/pressure", label: "Check Pressure" },
    { href: "/fit", label: "Update Fit" },
  ];

  return (
    <AppShell
      title="Dashboard"
      description="Ready-to-ride overview for your current bike."
      actions={<QuickActionsDropdown items={quickActions} />}
    >
      {!data.dbConnected ? (
        <section className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5 text-red-800 shadow-sm">
          <h2 className="font-display text-lg font-semibold tracking-tight">Database not connected</h2>
          <p className="mt-2 text-sm">
            Set <code>DATABASE_URL</code>, run <code>npm run db:push</code>, and then{" "}
            <code>npm run db:seed</code>.
          </p>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/maintenance" className="block">
          <MetricCard
            title="Ready to Ride"
            value={`${bike ? data.maintenance.readiness.score : 0}%`}
            subtitle={bike ? `${data.maintenance.readiness.label} · View maintenance` : "No bike found"}
            icon={<ShieldCheck className="h-5 w-5" />}
            className="h-full hover:bg-slate-50"
          />
        </Link>
        <Link href="/pressure" className="block">
          <MetricCard
            title="Pressure Recommendation"
            value={`${bike ? data.pressureRecommendation.frontPsi : 0}/${bike ? data.pressureRecommendation.rearPsi : 0}`}
            subtitle="Front/Rear PSI"
            icon={<Gauge className="h-5 w-5" />}
            className="h-full hover:bg-slate-50"
          />
        </Link>
        <Link href="/rides" className="block">
          <MetricCard
            title="Recent Miles"
            value={`${bikeMileage.toFixed(1)} mi`}
            subtitle="From logged rides"
            icon={<Activity className="h-5 w-5" />}
            className="h-full hover:bg-slate-50"
          />
        </Link>
        <Link href="/maintenance" className="block">
          <MetricCard
            title="Due Now"
            value={`${dueNowCount}`}
            subtitle="Maintenance items"
            icon={<Wrench className="h-5 w-5" />}
            className="h-full hover:bg-slate-50"
          />
        </Link>
      </section>

      {bike ? (
        <section className="mt-6 grid gap-4 xl:grid-cols-[320px_minmax(0,_1fr)]">
          <OrbitDial
            label="Readiness Pulse"
            value={data.maintenance.readiness.score}
            suffix="%"
            hint={`${dueNowCount} due now · ${dueSoonCount} due soon`}
            tone={data.maintenance.readiness.score >= 80 ? "emerald" : "orange"}
          />
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900">Readiness reasoning</h2>
              <Link
                href="/maintenance"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Open maintenance
              </Link>
            </div>
            {readinessReasons.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {readinessReasons.map((reason) => (
                  <li
                    key={reason}
                    className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                  >
                    {reason}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                No readiness deductions. You are fully ready to ride.
              </p>
            )}

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <section>
                <h3 className="font-display text-lg font-semibold tracking-tight text-slate-900">Due now / overdue</h3>
                <div className="mt-2 space-y-2">
                  {dueNowItems.length === 0 ? (
                    <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Nothing pending.</p>
                  ) : (
                    dueNowItems.map((item) => (
                      <Link
                        key={item.key}
                        href={`/maintenance?due=${encodeURIComponent(item.key)}`}
                        className="block rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 hover:bg-slate-100"
                      >
                        <article className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                            <p className="text-xs text-slate-600">{item.detail}</p>
                          </div>
                          <StatusBadge status={item.status} />
                        </article>
                      </Link>
                    ))
                  )}
                </div>
              </section>

              <section>
                <h3 className="font-display text-lg font-semibold tracking-tight text-slate-900">Due soon</h3>
                <div className="mt-2 space-y-2">
                  {dueSoonItems.length === 0 ? (
                    <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Nothing pending.</p>
                  ) : (
                    dueSoonItems.map((item) => (
                      <Link
                        key={item.key}
                        href={`/maintenance?due=${encodeURIComponent(item.key)}`}
                        className="block rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 hover:bg-slate-100"
                      >
                        <article className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                            <p className="text-xs text-slate-600">{item.detail}</p>
                          </div>
                          <StatusBadge status={item.status} />
                        </article>
                      </Link>
                    ))
                  )}
                </div>
              </section>
            </div>
          </section>
        </section>
      ) : null}

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900">Recent rides</h2>
            <Link
              href="/rides"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Open rides
            </Link>
          </div>
          {recentRides.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {recentRides.map((ride) => (
                <li
                  key={ride.id}
                  className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <p className="text-xs uppercase tracking-wide text-slate-600">
                    {ride.date.toLocaleDateString()}
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {ride.distanceMiles.toFixed(1)} mi · {ride.rideType.replaceAll("_", " ")}
                  </p>
                  <p className="text-xs text-slate-600">
                    {ride.durationMinutes ? `${ride.durationMinutes} min` : "Duration not set"}
                    {ride.roadCondition ? ` · ${ride.roadCondition}` : ""}
                    {ride.wasWet ? " · Wet ride" : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              No rides logged yet.
            </p>
          )}
        </section>

        <PillBars
          title="Component Mileage Load"
          items={componentMileageBars}
          valueSuffix="%"
          tone="orange"
          maxValue={100}
          minBarPercent={0}
          scrollable
          listMaxHeightClassName="max-h-[260px] overflow-y-auto pr-1"
          className="h-full"
          headerAction={<span className="text-xs font-medium text-slate-500">Miles Until Inspection</span>}
        />
      </section>

    </AppShell>
  );
}
