import { AppShell } from "@/components/layout/AppShell";
import { RideCard } from "@/components/rides/RideCard";
import { RideForm } from "@/components/rides/RideForm";
import { MetricCard } from "@/components/ui/MetricCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getRidesPageData() {
  try {
    const bike = await prisma.bike.findFirst({
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        name: true,
        rides: {
          orderBy: {
            date: "desc",
          },
        },
      },
    });

    return {
      bike,
      rides: bike?.rides ?? [],
      dbConnected: true,
    };
  } catch {
    return {
      bike: undefined,
      rides: [],
      dbConnected: false,
    };
  }
}

export default async function RidesPage() {
  const { bike, rides, dbConnected } = await getRidesPageData();
  const totalMiles = rides.reduce((sum, ride) => sum + ride.distanceMiles, 0);
  const now = new Date();
  const monthlyMiles = rides
    .filter(
      (ride) =>
        ride.date.getMonth() === now.getMonth() &&
        ride.date.getFullYear() === now.getFullYear(),
    )
    .reduce((sum, ride) => sum + ride.distanceMiles, 0);

  return (
    <AppShell
      title="Ride Log"
      description="Manual ride entries with automatic component mileage updates."
    >
      {!dbConnected ? (
        <section className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800 shadow-warm">
          <h2 className="font-display text-xl font-semibold">Database not connected</h2>
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

      <section className="mt-6">
        <RideForm bikeId={bike?.id} disabled={!bike || !dbConnected} />
      </section>

      <section className="mt-6">
        {rides.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {rides.map((ride) => (
              <RideCard key={ride.id} {...ride} />
            ))}
          </div>
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
