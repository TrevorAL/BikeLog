import Link from "next/link";
import type { ComponentType } from "@prisma/client";
import { Activity, Gauge, ShieldCheck, Wrench } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { DueSoonList } from "@/components/maintenance/DueSoonList";
import { MetricCard } from "@/components/ui/MetricCard";
import { OrbitDial } from "@/components/ui/viz/OrbitDial";
import { PillBars } from "@/components/ui/viz/PillBars";
import { WaveSparkline } from "@/components/ui/viz/WaveSparkline";
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
  const recentRides = bike ? bike.rides.slice(0, 5) : [];
  const rideTrendValues = bike ? [...bike.rides.slice(0, 12)].reverse().map((ride) => ride.distanceMiles) : [];
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
            hint: `${component.type.replaceAll("_", " ")} · ${dueItem.detail}`,
          };
        })
        .filter(
          (bar): bar is { label: string; value: number; hint: string } =>
            Boolean(bar),
        )
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)
    : [];
  const rideTypeMap = new Map<string, number>();
  for (const ride of bike?.rides ?? []) {
    const key = ride.rideType.replaceAll("_", " ");
    rideTypeMap.set(key, (rideTypeMap.get(key) ?? 0) + 1);
  }
  const rideTypeBars = Array.from(rideTypeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({
      label,
      value,
    }));

  return (
    <AppShell
      title="Dashboard"
      description="Ready-to-ride overview for your current bike."
      actions={
        <>
          <Link
            href="/rides"
            className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
          >
            Log Ride
          </Link>
          <Link
            href="/maintenance"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Add Maintenance
          </Link>
        </>
      }
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
        <section className="mt-6 grid gap-4 xl:grid-cols-3">
          <OrbitDial
            label="Readiness Pulse"
            value={data.maintenance.readiness.score}
            suffix="%"
            hint={`${dueNowCount} due now · ${dueSoonCount} due soon`}
            tone={data.maintenance.readiness.score >= 80 ? "emerald" : "orange"}
          />
          <WaveSparkline
            title="Ride Distance Wave"
            values={rideTrendValues}
            valueLabel={`${rideTrendValues.length} rides`}
            subtitle="Most recent rides trend from left to right."
            tone="sky"
          />
          <PillBars
            title="Ride Type Mix"
            items={rideTypeBars}
            tone="orange"
          />
        </section>
      ) : null}

      {bike ? (
        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900">Readiness reasoning</h2>
            <Link
              href="/maintenance"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Open maintenance
            </Link>
          </div>
          {data.maintenance.readiness.reasons.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {data.maintenance.readiness.reasons.map((reason) => (
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
        </section>
      ) : null}

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <DueSoonList
          title="Due now / overdue"
          items={bike ? data.maintenance.maintenanceSummary.dueNow : []}
          itemHrefBasePath="/maintenance"
        />
        <DueSoonList
          title="Due soon"
          items={bike ? data.maintenance.maintenanceSummary.dueSoon : []}
          itemHrefBasePath="/maintenance"
        />
      </section>

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
          tone="sky"
          maxValue={100}
          minBarPercent={0}
          scrollable
          listMaxHeightClassName="max-h-[340px] overflow-y-auto pr-1"
          className="h-full p-5"
          headerAction={
            <Link
              href="/components"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Open components
            </Link>
          }
        />
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { href: "/rides", label: "Log Ride" },
            { href: "/maintenance", label: "Lube Chain" },
            { href: "/pressure", label: "Check Pressure" },
            { href: "/maintenance", label: "Charge Di2" },
            { href: "/fit", label: "Update Fit" },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="rounded-md border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              {action.label}
            </Link>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-600">
          {bike
            ? `${bike.name} · ${bike.rides.length} rides currently logged.`
            : "No bike data found yet."}
        </p>
      </section>
    </AppShell>
  );
}
