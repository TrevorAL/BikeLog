import Link from "next/link";
import { ArrowRight, LayoutDashboard } from "lucide-react";

import { GarageScene } from "@/components/garage/GarageScene";
import { MetricCard } from "@/components/ui/MetricCard";
import { computeBikeMaintenance } from "@/lib/bike-maintenance";
import { prisma } from "@/lib/db";
import { calculatePressure } from "@/lib/pressure";

export const dynamic = "force-dynamic";

async function getHomePageMetrics() {
  try {
    const bike = await prisma.bike.findFirst({
      orderBy: { createdAt: "asc" },
      select: {
        rides: {
          select: {
            distanceMiles: true,
            date: true,
            wasWet: true,
            roadCondition: true,
          },
          orderBy: { date: "desc" },
        },
        components: {
          where: { isActive: true },
          select: {
            type: true,
            currentMileage: true,
          },
        },
        maintenanceEvents: {
          select: {
            type: true,
            date: true,
            mileageAtService: true,
          },
          orderBy: { date: "desc" },
        },
        pressureSetups: {
          orderBy: { updatedAt: "desc" },
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
        dbConnected: true,
        readinessScore: 0,
        readinessLabel: "No bike found",
        totalMiles: 0,
        pressureFront: 0,
        pressureRear: 0,
        maintenanceAlertCount: 0,
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

    const frontPsi = bike.pressureSetups[0]
      ? Math.round(bike.pressureSetups[0].frontPsi)
      : fallbackPressure.frontPsi;
    const rearPsi = bike.pressureSetups[0]
      ? Math.round(bike.pressureSetups[0].rearPsi)
      : fallbackPressure.rearPsi;

    return {
      dbConnected: true,
      readinessScore: maintenance.readiness.score,
      readinessLabel: maintenance.readiness.label,
      totalMiles: maintenance.bikeMileage,
      pressureFront: frontPsi,
      pressureRear: rearPsi,
      maintenanceAlertCount: maintenance.maintenanceSummary.dueNow.length,
    };
  } catch {
    return {
      dbConnected: false,
      readinessScore: 0,
      readinessLabel: "Database offline",
      totalMiles: 0,
      pressureFront: 0,
      pressureRear: 0,
      maintenanceAlertCount: 0,
    };
  }
}

export default async function HomePage() {
  const metrics = await getHomePageMetrics();

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-100 via-amber-50 to-orange-100">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-[2rem] border border-orange-300 bg-white/90 p-6 shadow-warm">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.24em] text-orange-700 uppercase">BikeLog</p>
              <h1 className="font-display mt-2 text-4xl font-bold text-orange-950 sm:text-5xl">
                Your cycling garage, tuned and ready.
              </h1>
              <p className="mt-3 text-sm text-orange-900/80 sm:text-base">
                Open the garage and jump into bike setup, maintenance, rides, pressure, and fit tracking.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700"
            >
              <LayoutDashboard className="h-4 w-4" />
              Open Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {!metrics.dbConnected ? (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              Database not connected. Live metrics are unavailable.
            </p>
          ) : null}

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Ready to Ride"
              value={`${metrics.readinessScore}%`}
              subtitle={metrics.readinessLabel}
            />
            <MetricCard
              title="Total Logged Miles"
              value={`${metrics.totalMiles.toFixed(1)} mi`}
              subtitle="Across all logged rides"
            />
            <MetricCard
              title="Pressure Today"
              value={`${metrics.pressureFront}/${metrics.pressureRear} PSI`}
              subtitle="Front / Rear"
            />
            <MetricCard
              title="Maintenance Alerts"
              value={`${metrics.maintenanceAlertCount}`}
              subtitle="Due now or overdue"
            />
          </div>
        </header>

        <GarageScene />
      </div>
    </div>
  );
}
