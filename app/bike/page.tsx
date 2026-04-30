import { BikeManager } from "@/components/bike/BikeManager";
import { BikeSummaryCard } from "@/components/bike/BikeSummaryCard";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricCard } from "@/components/ui/MetricCard";
import { QuickActionsDropdown } from "@/components/ui/QuickActionsDropdown";
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
  const rideTrendRides = bike ? [...bike.rides.slice(0, 24)].reverse() : [];
  const rideTrendValues = rideTrendRides.map((ride) => ride.distanceMiles);
  const rideTrendAxisLabels =
    rideTrendRides.length > 0
      ? {
          left: rideTrendRides[0].date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
          right: rideTrendRides[rideTrendRides.length - 1].date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
        }
      : undefined;
  const quickActions = [
    { href: editBikeHref, label: "Edit Bike" },
    { href: "/components?open=add#add-component-form", label: "Add Component" },
    { href: "/rides?open=log#ride-log-form", label: "Log Ride" },
    { href: "/maintenance#maintenance-log-form", label: "Log Maintenance" },
  ];

  return (
    <AppShell
      title="Bike Profile"
      description="Main bike details and quick stats."
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

          <section className="mt-6">
            <WaveSparkline
              title="Ride Distance Stream"
              values={rideTrendValues}
              valueLabel={`${rideTrendRides.length} ride sample`}
              subtitle="Detailed distance trend across your latest rides."
              tone="sky"
              size="large"
              detailed
              xAxisLabels={rideTrendAxisLabels}
            />
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
