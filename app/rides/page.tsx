import { AppShell } from "@/components/layout/AppShell";
import { RideCard } from "@/components/rides/RideCard";
import { RideForm } from "@/components/rides/RideForm";
import { MetricCard } from "@/components/ui/MetricCard";
import { mockRides } from "@/lib/mock-data";

export default function RidesPage() {
  const totalMiles = mockRides.reduce((sum, ride) => sum + ride.distanceMiles, 0);

  return (
    <AppShell title="Ride Log" description="Manual ride entries with component mileage updates.">
      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard title="Total miles" value={`${totalMiles.toFixed(1)} mi`} />
        <MetricCard title="Recent rides" value={`${mockRides.length}`} />
        <MetricCard
          title="Wet rides"
          value={`${mockRides.filter((ride) => ride.wasWet).length}`}
          subtitle="Trigger chain cleaning reminders"
        />
      </section>

      <section className="mt-6">
        <RideForm />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-2">
        {mockRides.map((ride) => (
          <RideCard key={ride.id} {...ride} />
        ))}
      </section>
    </AppShell>
  );
}
