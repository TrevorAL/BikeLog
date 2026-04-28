import Link from "next/link";

import { BikeSummaryCard } from "@/components/bike/BikeSummaryCard";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricCard } from "@/components/ui/MetricCard";
import { requireServerUser } from "@/lib/auth";
import { computeBikeMaintenance } from "@/lib/bike-maintenance";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getBikePageData(userId: string) {
  try {
    const bike = await prisma.bike.findFirst({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        name: true,
        brand: true,
        model: true,
        year: true,
        type: true,
        frameSize: true,
        frameMaterial: true,
        drivetrain: true,
        brakeType: true,
        wheelset: true,
        tireSetup: true,
        notes: true,
        components: {
          where: {
            isActive: true,
          },
          select: {
            type: true,
            currentMileage: true,
          },
        },
        rides: {
          orderBy: {
            date: "desc",
          },
          select: {
            id: true,
            date: true,
            distanceMiles: true,
            wasWet: true,
            roadCondition: true,
          },
        },
        maintenanceEvents: {
          orderBy: {
            date: "desc",
          },
          select: {
            id: true,
            type: true,
            date: true,
            mileageAtService: true,
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

    return {
      bike,
      maintenance,
      dbConnected: true,
    };
  } catch {
    return {
      bike: undefined,
      dbConnected: false,
    };
  }
}

export default async function BikePage() {
  const user = await requireServerUser();
  const data = await getBikePageData(user.id);
  const bike = data.bike;

  const lastRide = bike?.rides[0];
  const lastService = bike?.maintenanceEvents[0];

  return (
    <AppShell title="Bike Profile" description="Main bike details and quick stats.">
      {!data.dbConnected ? (
        <section className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800 shadow-warm">
          <h2 className="font-display text-xl font-semibold">Database not connected</h2>
          <p className="mt-2 text-sm">
            Set <code>DATABASE_URL</code>, run <code>npm run db:push</code>, and then{" "}
            <code>npm run db:seed</code>.
          </p>
        </section>
      ) : null}

      {bike ? (
        <>
          <BikeSummaryCard
            name={`${bike.year ? `${bike.year} ` : ""}${bike.brand ?? ""} ${bike.model ?? bike.name}`.trim()}
            subtitle={`${bike.drivetrain ?? "Drivetrain not set"} · ${bike.brakeType ?? "Brake type not set"}`}
          >
            <div className="rounded-2xl bg-orange-50 p-4">
              <p className="text-xs text-orange-700">Frame</p>
              <p className="text-sm font-semibold text-orange-950">
                {bike.frameMaterial ?? "Not set"}
                {bike.frameSize ? ` · ${bike.frameSize}` : ""}
              </p>
            </div>
            <div className="rounded-2xl bg-orange-50 p-4">
              <p className="text-xs text-orange-700">Wheelset</p>
              <p className="text-sm font-semibold text-orange-950">{bike.wheelset ?? "Not set"}</p>
            </div>
            <div className="rounded-2xl bg-orange-50 p-4">
              <p className="text-xs text-orange-700">Tires</p>
              <p className="text-sm font-semibold text-orange-950">{bike.tireSetup ?? "Not set"}</p>
            </div>
            <div className="rounded-2xl bg-orange-50 p-4">
              <p className="text-xs text-orange-700">Notes</p>
              <p className="text-sm font-semibold text-orange-950">{bike.notes ?? "No notes yet"}</p>
            </div>
          </BikeSummaryCard>

          <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Total Logged Miles" value={`${data.maintenance.bikeMileage.toFixed(1)} mi`} />
            <MetricCard title="Active Components" value={`${bike.components.length}`} />
            <MetricCard
              title="Maintenance Due"
              value={`${data.maintenance.maintenanceSummary.dueNow.length}`}
            />
            <MetricCard
              title="Last Ride"
              value={lastRide ? lastRide.date.toLocaleDateString() : "No rides"}
              subtitle={lastRide ? `${lastRide.distanceMiles.toFixed(1)} mi` : undefined}
            />
          </section>

          <section className="mt-3 grid gap-3 sm:grid-cols-2">
            <MetricCard
              title="Last Service"
              value={lastService ? lastService.date.toLocaleDateString() : "No service yet"}
              subtitle={lastService ? lastService.type.replaceAll("_", " ") : undefined}
            />
            <MetricCard
              title="Ready to Ride"
              value={`${data.maintenance.readiness.score}%`}
              subtitle={data.maintenance.readiness.label}
            />
          </section>

          <section className="mt-6 rounded-3xl border border-orange-200 bg-white p-5 shadow-warm">
            <h2 className="font-display text-xl font-semibold text-orange-950">Quick actions</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { href: "/bike", label: "Edit Bike" },
                { href: "/components", label: "Add Component" },
                { href: "/rides", label: "Log Ride" },
                { href: "/maintenance", label: "Log Maintenance" },
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
          </section>
        </>
      ) : (
        <EmptyState
          title="No bike profile found"
          description="Seed the default bike first, then this page will show live profile and summary data."
        />
      )}
    </AppShell>
  );
}
