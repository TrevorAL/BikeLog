import { AppShell } from "@/components/layout/AppShell";
import { RideForm } from "@/components/rides/RideForm";
import { RideList } from "@/components/rides/RideList";
import { StravaImportPanel } from "@/components/rides/StravaImportPanel";
import { MetricCard } from "@/components/ui/MetricCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireServerUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOwnedBikeId } from "@/lib/ownership";

export const dynamic = "force-dynamic";

type RidesPageProps = {
  searchParams?: Promise<{
    open?: string;
  }>;
};

async function getRidesPageData(userId: string) {
  try {
    const bikeId = await getOwnedBikeId({ userId });
    if (!bikeId) {
      return {
        bike: undefined,
        rides: [],
        stravaConnection: null,
        dbConnected: true,
      };
    }

    const [bike, stravaConnection] = await Promise.all([
      prisma.bike.findUnique({
        where: {
          id: bikeId,
        },
        select: {
          id: true,
          name: true,
          brand: true,
          model: true,
          year: true,
          rides: {
            orderBy: {
              date: "desc",
            },
          },
        },
      }),
      prisma.stravaConnection.findUnique({
        where: {
          userId,
        },
        select: {
          id: true,
          scope: true,
          expiresAt: true,
          lastSyncAt: true,
          lastSyncImportedCount: true,
          lastSyncStatus: true,
          lastSyncError: true,
          _count: {
            select: {
              activityImports: true,
            },
          },
        },
      }),
    ]);

    return {
      bike,
      rides: bike?.rides ?? [],
      stravaConnection,
      dbConnected: true,
    };
  } catch {
    return {
      bike: undefined,
      rides: [],
      stravaConnection: null,
      dbConnected: false,
    };
  }
}

export default async function RidesPage({ searchParams }: RidesPageProps) {
  const user = await requireServerUser();
  const openQuery = (await searchParams)?.open?.toLowerCase();
  const shouldOpenRideForm = openQuery === "log" || openQuery === "true" || openQuery === "1";
  const { bike, rides, stravaConnection, dbConnected } = await getRidesPageData(user.id);
  const totalMiles = rides.reduce((sum, ride) => sum + ride.distanceMiles, 0);
  const now = new Date();
  const monthlyMiles = rides
    .filter(
      (ride) =>
        ride.date.getMonth() === now.getMonth() &&
        ride.date.getFullYear() === now.getFullYear(),
    )
    .reduce((sum, ride) => sum + ride.distanceMiles, 0);
  const rideListItems = rides.map((ride) => ({
    id: ride.id,
    date: ride.date.toISOString(),
    distanceMiles: ride.distanceMiles,
    durationMinutes: ride.durationMinutes,
    rideType: ride.rideType,
    weather: ride.weather,
    roadCondition: ride.roadCondition,
    wasWet: ride.wasWet,
    notes: ride.notes,
  }));
  const bikeDisplayName = bike
    ? [bike.year, bike.brand, bike.model].filter(Boolean).join(" ").trim() || bike.name
    : undefined;

  return (
    <AppShell
      title="Ride Log"
      description="Manual ride entries with automatic component mileage updates."
    >
      {!dbConnected ? (
        <section className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5 text-red-800 shadow-sm">
          <h2 className="font-display text-lg font-semibold tracking-tight">Database not connected</h2>
          <p className="mt-2 text-sm">
            Set <code>DATABASE_URL</code>, run <code>npm run db:push</code>, and then{" "}
            <code>npm run db:seed</code>.
          </p>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard title="Total miles" value={`${totalMiles.toFixed(1)} mi`} />
        <MetricCard title="Monthly miles" value={`${monthlyMiles.toFixed(1)} mi`} />
        <MetricCard
          title="Wet rides"
          value={`${rides.filter((ride) => ride.wasWet).length}`}
          subtitle="Used for chain-clean reminders"
        />
      </section>

      <section id="ride-log-form" className="mt-6 scroll-mt-24">
        <RideForm
          bikeId={bike?.id}
          disabled={!bike || !dbConnected}
          collapsible
          defaultOpen={shouldOpenRideForm}
        />
      </section>

      <section className="mt-6">
        <StravaImportPanel
          bikeId={bike?.id}
          bikeName={bikeDisplayName}
          disabled={!bike || !dbConnected}
          connection={
            stravaConnection
              ? {
                  id: stravaConnection.id,
                  sync: {
                    status: stravaConnection.lastSyncStatus,
                    lastSyncAt: stravaConnection.lastSyncAt?.toISOString() ?? null,
                    lastSyncImportedCount: stravaConnection.lastSyncImportedCount,
                    lastSyncError: stravaConnection.lastSyncError,
                    totalImportedCount: stravaConnection._count.activityImports,
                    expiresAt: stravaConnection.expiresAt.toISOString(),
                    scope: stravaConnection.scope,
                  },
                }
              : null
          }
        />
      </section>

      <section className="mt-6">
        {rides.length > 0 ? (
          <RideList rides={rideListItems} />
        ) : (
          <EmptyState
            title="No rides logged yet"
            description="Log your first ride to start tracking component mileage."
          />
        )}
      </section>
    </AppShell>
  );
}
