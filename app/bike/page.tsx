import Link from "next/link";

import { BikeSummaryCard } from "@/components/bike/BikeSummaryCard";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/ui/MetricCard";
import {
  maintenanceSummary,
  mockBike,
  mockComponents,
  mockMaintenanceEvents,
  mockRides,
} from "@/lib/mock-data";

export default function BikePage() {
  const lastRide = mockRides[0];
  const lastService = mockMaintenanceEvents[0];

  return (
    <AppShell title="Bike Profile" description="Main bike details and quick stats.">
      <BikeSummaryCard
        name={`${mockBike.year} ${mockBike.brand} ${mockBike.model}`}
        subtitle={`${mockBike.drivetrain} · ${mockBike.brakeType}`}
      >
        <div className="rounded-2xl bg-orange-50 p-4">
          <p className="text-xs text-orange-700">Frame</p>
          <p className="text-sm font-semibold text-orange-950">{mockBike.frameMaterial}</p>
        </div>
        <div className="rounded-2xl bg-orange-50 p-4">
          <p className="text-xs text-orange-700">Wheelset</p>
          <p className="text-sm font-semibold text-orange-950">{mockBike.wheelset}</p>
        </div>
        <div className="rounded-2xl bg-orange-50 p-4">
          <p className="text-xs text-orange-700">Tires</p>
          <p className="text-sm font-semibold text-orange-950">{mockBike.tireSetup}</p>
        </div>
        <div className="rounded-2xl bg-orange-50 p-4">
          <p className="text-xs text-orange-700">Notes</p>
          <p className="text-sm font-semibold text-orange-950">{mockBike.notes}</p>
        </div>
      </BikeSummaryCard>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Active Components" value={`${mockComponents.length}`} />
        <MetricCard title="Maintenance Due" value={`${maintenanceSummary.dueNow.length}`} />
        <MetricCard title="Last Ride" value={lastRide.date.toLocaleDateString()} subtitle={`${lastRide.distanceMiles} mi`} />
        <MetricCard
          title="Last Service"
          value={lastService.date.toLocaleDateString()}
          subtitle={lastService.type.replaceAll("_", " ")}
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
    </AppShell>
  );
}
