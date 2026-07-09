import Link from "next/link";
import type { ComponentType } from "@prisma/client";
import { Activity, Gauge, Wrench } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { ReadinessGauge } from "@/components/dashboard/ReadinessGauge";
import { Button } from "@/components/ui/Button";
import { MetricCard } from "@/components/ui/MetricCard";
import { QuickActionsDropdown } from "@/components/ui/QuickActionsDropdown";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PillBars } from "@/components/ui/viz/PillBars";
import { requireServerUser } from "@/lib/auth";
import { computeBikeMaintenance } from "@/lib/bike-maintenance";
import { MAINTENANCE_INTERVALS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { getOwnedBikeId } from "@/lib/ownership";
import { calculatePressure } from "@/lib/pressure";
import { getReadinessTone } from "@/lib/readiness";

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
  const readinessTone = getReadinessTone(bike ? data.maintenance.readiness.score : 0);
  const dueNowCount = bike ? data.maintenance.maintenanceSummary.dueNow.length : 0;
  const dueSoonCount = bike ? data.maintenance.maintenanceSummary.dueSoon.length : 0;
  const dueNowItems = bike ? data.maintenance.maintenanceSummary.dueNow : [];
  const dueSoonItems = bike ? data.maintenance.maintenanceSummary.dueSoon : [];
  const attentionItemsAll = [...dueNowItems, ...dueSoonItems];
  const attentionItems = attentionItemsAll.slice(0, 6);
  const remainingAttentionCount = attentionItemsAll.length - attentionItems.length;
  const recentRides = bike ? bike.rides.slice(0, 5) : [];
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekMiles = bike
    ? bike.rides
        .filter((ride) => ride.date >= weekAgo)
        .reduce((sum, ride) => sum + ride.distanceMiles, 0)
    : 0;
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
  const onboardingSteps = [
    {
      title: "Add your bike",
      description: "Tell BikeLog about your ride — make, model, year, and frame details.",
      href: "/bike?openAddBike=1#bike-manager",
      cta: "Add bike",
      done: !!bike,
    },
    {
      title: "Add a component",
      description: "Track your drivetrain, brakes, tires, and more so BikeLog can monitor wear.",
      href: "/components",
      cta: "Add component",
      done: !!(bike && bike.components.length > 0),
    },
    {
      title: "Log your first ride",
      description: "Connect Strava or log a ride manually to start building your history.",
      href: "/rides?open=log#ride-log-form",
      cta: "Log ride",
      done: !!(bike && bike.rides.length > 0),
    },
  ];
  const showOnboarding = onboardingSteps.some((s) => !s.done);

  const quickActions = [
    { href: "/maintenance?open=log#maintenance-log-form", label: "Log Maintenance" },
    { href: "/maintenance?open=log&due=chain-lube#maintenance-log-form", label: "Lube Chain" },
    { href: "/maintenance?open=log&due=di2-charge#maintenance-log-form", label: "Charge Di2" },
    { href: "/pressure", label: "Check Pressure" },
    { href: "/fit/bike?open=add#fit-measurement-form", label: "Add Fit Measurement" },
  ];

  return (
    <AppShell
      title="Dashboard"
      description="Ready-to-ride overview for your current bike."
      actions={<QuickActionsDropdown items={quickActions} />}
    >
      {!data.dbConnected ? (
        <section className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800 shadow-card">
          <h2 className="font-display text-lg font-semibold tracking-tight">Database not connected</h2>
          <p className="mt-2 text-sm">
            Set <code>DATABASE_URL</code>, run <code>npm run db:push</code>, and then{" "}
            <code>npm run db:seed</code>.
          </p>
        </section>
      ) : null}

      {bike ? (
        <section className="hero-gradient mb-6 overflow-hidden rounded-2xl px-5 py-5 shadow-card sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
                {bike.name}
              </h2>
              <p className="mt-0.5 text-sm text-slate-300">
                {dueNowCount > 0
                  ? `${dueNowCount} item${dueNowCount === 1 ? "" : "s"} due now`
                  : dueSoonCount > 0
                    ? `${dueSoonCount} item${dueSoonCount === 1 ? "" : "s"} due soon`
                    : "All maintenance up to date"}
                {" · "}
                {bikeMileage.toFixed(0)} mi logged
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <ReadinessGauge
                compact
                score={data.maintenance.readiness.score}
                label={data.maintenance.readiness.label}
                tone={readinessTone}
              />
              <Button href="/rides?open=log#ride-log-form" variant="primary">
                Log a ride
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {bike && showOnboarding && (
        <OnboardingChecklist steps={onboardingSteps} />
      )}

      {bike ? (
        <>
          <section className={`grid gap-4 sm:grid-cols-3 ${showOnboarding ? "mt-6" : ""}`}>
            <Link href="/rides" className="block">
              <MetricCard
                title="Total Miles"
                value={`${bikeMileage.toFixed(1)} mi`}
                subtitle={
                  weekMiles > 0
                    ? `+${weekMiles.toFixed(1)} mi in the last 7 days`
                    : "No rides in the last 7 days"
                }
                icon={<Activity className="h-5 w-5" />}
                className="h-full"
              />
            </Link>
            <Link href="/pressure" className="block">
              <MetricCard
                title="Tire Pressure"
                value={`${data.pressureRecommendation.frontPsi}/${data.pressureRecommendation.rearPsi} psi`}
                subtitle="Front / rear recommendation"
                icon={<Gauge className="h-5 w-5" />}
                className="h-full"
              />
            </Link>
            <Link href="/maintenance" className="block">
              <MetricCard
                title="Due Now"
                value={`${dueNowCount}`}
                subtitle={`${dueSoonCount} due soon`}
                icon={<Wrench className="h-5 w-5" />}
                className="h-full"
              />
            </Link>
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            <section className="surface-card flex flex-col p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900">
                  Needs attention
                </h2>
                <Button href="/maintenance" variant="secondary" size="sm">
                  Open maintenance
                </Button>
              </div>
              {attentionItems.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {attentionItems.map((item) => (
                    <li key={item.key}>
                      <Link
                        href={`/maintenance?due=${encodeURIComponent(item.key)}`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 hover:bg-slate-100"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                          <p className="text-xs text-slate-600">{item.detail}</p>
                        </div>
                        <StatusBadge status={item.status} />
                      </Link>
                    </li>
                  ))}
                  {remainingAttentionCount > 0 ? (
                    <li>
                      <Link
                        href="/maintenance"
                        className="block rounded-lg px-3 py-2 text-center text-xs font-semibold text-brand-600 hover:text-brand-700"
                      >
                        +{remainingAttentionCount} more in Maintenance
                      </Link>
                    </li>
                  ) : null}
                </ul>
              ) : (
                <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  Nothing needs attention. You are fully ready to ride.
                </p>
              )}
            </section>

            <section className="surface-card flex flex-col p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900">Recent rides</h2>
                <Button href="/rides" variant="secondary" size="sm">
                  Open rides
                </Button>
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
          </section>

          <PillBars
            title="Component Health"
            items={componentMileageBars}
            valueSuffix="%"
            maxValue={100}
            thresholds
            className="mt-6"
            headerAction={
              <Link href="/components" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                View components &rarr;
              </Link>
            }
          />
        </>
      ) : (
        <OnboardingChecklist steps={onboardingSteps} />
      )}
    </AppShell>
  );
}
