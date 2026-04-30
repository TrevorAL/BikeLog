import Link from "next/link";

import { BikeManager } from "@/components/bike/BikeManager";
import { BikeSummaryCard } from "@/components/bike/BikeSummaryCard";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricCard } from "@/components/ui/MetricCard";
import { OrbitDial } from "@/components/ui/viz/OrbitDial";
import { PillBars } from "@/components/ui/viz/PillBars";
import { WaveSparkline } from "@/components/ui/viz/WaveSparkline";
import { requireServerUser } from "@/lib/auth";
import { computeBikeMaintenance } from "@/lib/bike-maintenance";
import { prisma } from "@/lib/db";
import { getOwnedBikeId } from "@/lib/ownership";

export const dynamic = "force-dynamic";

type BikePageProps = {
  searchParams?: Promise<{
    editBikeId?: string;
  }>;
};

async function getBikePageData(userId: string) {
  try {
    const bikeId = await getOwnedBikeId({ userId });
    if (!bikeId) {
      return {
        bike: undefined,
        bikes: [],
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
            name: true,
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
            durationMinutes: true,
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
            notes: true,
          },
        },
      },
    });

    const bikes = await prisma.bike.findMany({
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
        isArchived: true,
      },
    });

    if (!bike) {
      return {
        bike: undefined,
        bikes,
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
      bikes,
      maintenance,
      dbConnected: true,
    };
  } catch {
    return {
      bike: undefined,
      bikes: [],
      dbConnected: false,
    };
  }
}

export default async function BikePage({ searchParams }: BikePageProps) {
  const user = await requireServerUser();
  const data = await getBikePageData(user.id);
  const requestedEditBikeId = (await searchParams)?.editBikeId;
  const initialEditingBikeId =
    requestedEditBikeId &&
    data.bikes.some((candidate) => candidate.id === requestedEditBikeId && !candidate.isArchived)
      ? requestedEditBikeId
      : undefined;
  const bike = data.bike;

  const lastRide = bike?.rides[0];
  const lastService = bike?.maintenanceEvents[0];
  const editBikeHref = bike
    ? `/bike?editBikeId=${encodeURIComponent(bike.id)}#bike-manager`
    : "/bike#bike-manager";
  const rideTrendValues = bike
    ? [...bike.rides.slice(0, 12)].reverse().map((ride) => ride.distanceMiles)
    : [];
  const componentMileageBars = bike
    ? [...bike.components]
        .sort((a, b) => b.currentMileage - a.currentMileage)
        .slice(0, 6)
        .map((component) => ({
          label: component.name,
          value: component.currentMileage,
          hint: component.type.replaceAll("_", " "),
        }))
    : [];
  const serviceMileages = bike
    ? bike.maintenanceEvents
        .filter((event) => typeof event.mileageAtService === "number")
        .slice(0, 8)
        .reverse()
        .map((event) => event.mileageAtService as number)
    : [];

  return (
    <AppShell title="Bike Profile" description="Main bike details and quick stats.">
      {!data.dbConnected ? (
        <section className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5 text-red-800 shadow-sm">
          <h2 className="font-display text-lg font-semibold tracking-tight">Database not connected</h2>
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
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-600">Frame</p>
              <p className="text-sm font-semibold text-slate-900">
                {bike.frameMaterial ?? "Not set"}
                {bike.frameSize ? ` · ${bike.frameSize}` : ""}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-600">Wheelset</p>
              <p className="text-sm font-semibold text-slate-900">{bike.wheelset ?? "Not set"}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-600">Tires</p>
              <p className="text-sm font-semibold text-slate-900">{bike.tireSetup ?? "Not set"}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-600">Notes</p>
              <p className="text-sm font-semibold text-slate-900">{bike.notes ?? "No notes yet"}</p>
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

          <section className="mt-6 grid gap-4 xl:grid-cols-3">
            <OrbitDial
              label="Ready Gauge"
              value={data.maintenance.readiness.score}
              suffix="%"
              hint={data.maintenance.readiness.label}
              tone={data.maintenance.readiness.score >= 80 ? "emerald" : "orange"}
            />
            <WaveSparkline
              title="Ride Distance Stream"
              values={rideTrendValues}
              valueLabel={`${bike.rides.length} total rides`}
              subtitle="Newest rides push the wave to the right."
              tone="sky"
            />
            <PillBars
              title="Component Mileage Stack"
              items={componentMileageBars}
              valueSuffix=" mi"
              tone="sky"
              scrollable
              className="h-full"
            />
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-2">
            <WaveSparkline
              title="Service Mileage Rhythm"
              values={serviceMileages}
              valueLabel={serviceMileages.length > 0 ? `${serviceMileages.length} logged events` : "No samples"}
              subtitle="Mileage points captured at each service event."
              tone="orange"
            />
            <OrbitDial
              label="Service Coverage"
              value={Math.max(0, 100 - data.maintenance.maintenanceSummary.dueNow.length * 22)}
              suffix="%"
              hint={`${data.maintenance.maintenanceSummary.dueNow.length} due now`}
              tone={data.maintenance.maintenanceSummary.dueNow.length > 0 ? "orange" : "emerald"}
            />
          </section>

          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900">Quick actions</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { href: editBikeHref, label: "Edit Bike" },
                { href: "/components?open=add#add-component-form", label: "Add Component" },
                { href: "/rides?open=log#ride-log-form", label: "Log Ride" },
                { href: "/maintenance#maintenance-log-form", label: "Log Maintenance" },
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
          </section>
        </>
      ) : (
        <EmptyState
          title="No active bike selected"
          description="Create a new bike or restore an archived bike below."
        />
      )}

      <section id="bike-manager" className="mt-6 scroll-mt-24">
        <BikeManager
          key={`${bike?.id ?? "none"}:${initialEditingBikeId ?? "none"}`}
          bikes={data.bikes}
          selectedBikeId={bike?.id}
          initialEditingBikeId={initialEditingBikeId}
        />
      </section>
    </AppShell>
  );
}
