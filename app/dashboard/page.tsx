import Link from "next/link";
import { Activity, Gauge, ShieldCheck, Wrench } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { DueSoonList } from "@/components/maintenance/DueSoonList";
import { MetricCard } from "@/components/ui/MetricCard";
import { requireServerUser } from "@/lib/auth";
import { computeBikeMaintenance } from "@/lib/bike-maintenance";
import { prisma } from "@/lib/db";
import { getOwnedBikeId } from "@/lib/ownership";
import { calculatePressure } from "@/lib/pressure";

export const dynamic = "force-dynamic";

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
  const recentRides = bike ? bike.rides.slice(0, 5) : [];
  const componentMileageHighlights = bike
    ? [...bike.components].sort((a, b) => b.currentMileage - a.currentMileage).slice(0, 6)
    : [];

  return (
    <AppShell
      title="Dashboard"
      description="Ready-to-ride overview for your current bike."
      actions={
        <>
          <Link
            href="/rides"
            className="rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
          >
            Log Ride
          </Link>
          <Link
            href="/maintenance"
            className="rounded-full border border-orange-300 px-4 py-2 text-sm font-semibold text-orange-900 hover:bg-orange-100"
          >
            Add Maintenance
          </Link>
        </>
      }
    >
      {!data.dbConnected ? (
        <section className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800 shadow-warm">
          <h2 className="font-display text-xl font-semibold">Database not connected</h2>
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
            className="h-full hover:bg-orange-50/70"
          />
        </Link>
        <Link href="/pressure" className="block">
          <MetricCard
            title="Pressure Recommendation"
            value={`${bike ? data.pressureRecommendation.frontPsi : 0}/${bike ? data.pressureRecommendation.rearPsi : 0}`}
            subtitle="Front/Rear PSI"
            icon={<Gauge className="h-5 w-5" />}
            className="h-full hover:bg-orange-50/70"
          />
        </Link>
        <Link href="/rides" className="block">
          <MetricCard
            title="Recent Miles"
            value={`${bikeMileage.toFixed(1)} mi`}
            subtitle="From logged rides"
            icon={<Activity className="h-5 w-5" />}
            className="h-full hover:bg-orange-50/70"
          />
        </Link>
        <Link href="/maintenance" className="block">
          <MetricCard
            title="Due Now"
            value={`${dueNowCount}`}
            subtitle="Maintenance items"
            icon={<Wrench className="h-5 w-5" />}
            className="h-full hover:bg-orange-50/70"
          />
        </Link>
      </section>

      {bike ? (
        <section className="mt-4 rounded-3xl border border-orange-200 bg-white p-5 shadow-warm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-orange-950">Readiness reasoning</h2>
            <Link
              href="/maintenance"
              className="rounded-full border border-orange-300 px-3 py-1.5 text-xs font-semibold text-orange-900 hover:bg-orange-100"
            >
              Open maintenance
            </Link>
          </div>
          {data.maintenance.readiness.reasons.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {data.maintenance.readiness.reasons.map((reason) => (
                <li
                  key={reason}
                  className="rounded-2xl border border-orange-100 bg-orange-50/70 px-3 py-2 text-sm text-orange-900/80"
                >
                  {reason}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
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
        <section className="rounded-3xl border border-orange-200 bg-white p-5 shadow-warm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-orange-950">Recent rides</h2>
            <Link
              href="/rides"
              className="rounded-full border border-orange-300 px-3 py-1.5 text-xs font-semibold text-orange-900 hover:bg-orange-100"
            >
              Open rides
            </Link>
          </div>
          {recentRides.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {recentRides.map((ride) => (
                <li
                  key={ride.id}
                  className="rounded-2xl border border-orange-100 bg-orange-50/70 px-3 py-2"
                >
                  <p className="text-xs uppercase tracking-wide text-orange-700">
                    {ride.date.toLocaleDateString()}
                  </p>
                  <p className="text-sm font-semibold text-orange-950">
                    {ride.distanceMiles.toFixed(1)} mi · {ride.rideType.replaceAll("_", " ")}
                  </p>
                  <p className="text-xs text-orange-900/75">
                    {ride.durationMinutes ? `${ride.durationMinutes} min` : "Duration not set"}
                    {ride.roadCondition ? ` · ${ride.roadCondition}` : ""}
                    {ride.wasWet ? " · Wet ride" : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-2xl border border-dashed border-orange-300 bg-orange-50 px-3 py-2 text-sm text-orange-900/75">
              No rides logged yet.
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-orange-200 bg-white p-5 shadow-warm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-orange-950">
              Component mileage highlights
            </h2>
            <Link
              href="/components"
              className="rounded-full border border-orange-300 px-3 py-1.5 text-xs font-semibold text-orange-900 hover:bg-orange-100"
            >
              Open components
            </Link>
          </div>
          {componentMileageHighlights.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {componentMileageHighlights.map((component) => (
                <li
                  key={component.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-orange-50/70 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-orange-950">{component.name}</p>
                    <p className="text-xs text-orange-900/75">
                      {component.type.replaceAll("_", " ")}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-orange-950">
                    {component.currentMileage.toFixed(1)} mi
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-2xl border border-dashed border-orange-300 bg-orange-50 px-3 py-2 text-sm text-orange-900/75">
              No active components found.
            </p>
          )}
        </section>
      </section>

      <section className="mt-6 rounded-3xl border border-orange-200 bg-white p-5 shadow-warm">
        <h2 className="font-display text-xl font-semibold text-orange-950">Quick actions</h2>
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
              className="rounded-full border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-900 hover:bg-orange-100"
            >
              {action.label}
            </Link>
          ))}
        </div>
        <p className="mt-4 text-sm text-orange-900/75">
          {bike
            ? `${bike.name} · ${bike.rides.length} rides currently logged.`
            : "No bike data found yet."}
        </p>
      </section>
    </AppShell>
  );
}
