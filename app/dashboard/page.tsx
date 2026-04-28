import Link from "next/link";
import { Activity, Gauge, ShieldCheck, Wrench } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { DueSoonList } from "@/components/maintenance/DueSoonList";
import { MetricCard } from "@/components/ui/MetricCard";
import {
  bikeMileageTotal,
  maintenanceSummary,
  mockBike,
  mockPressureRecommendation,
  mockReadiness,
  mockRides,
} from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <AppShell
      title="Dashboard"
      description="Ready-to-ride overview for your current bike."
      actions={
        <>
          <Link href="/rides" className="rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">
            Log Ride
          </Link>
          <Link href="/maintenance" className="rounded-full border border-orange-300 px-4 py-2 text-sm font-semibold text-orange-900 hover:bg-orange-100">
            Add Maintenance
          </Link>
        </>
      }
    >
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Ready to Ride" value={`${mockReadiness.score}%`} subtitle={mockReadiness.label} icon={<ShieldCheck className="h-5 w-5" />} />
        <MetricCard
          title="Pressure Recommendation"
          value={`${mockPressureRecommendation.frontPsi}/${mockPressureRecommendation.rearPsi}`}
          subtitle="Front/Rear PSI"
          icon={<Gauge className="h-5 w-5" />}
        />
        <MetricCard title="Recent Miles" value={`${bikeMileageTotal.toFixed(1)} mi`} subtitle="Current log sample" icon={<Activity className="h-5 w-5" />} />
        <MetricCard title="Due Now" value={`${maintenanceSummary.dueNow.length}`} subtitle="Maintenance items" icon={<Wrench className="h-5 w-5" />} />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <DueSoonList title="Due now / overdue" items={maintenanceSummary.dueNow} />
        <DueSoonList title="Due soon" items={maintenanceSummary.dueSoon} />
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
          {mockBike.name} · {mockRides.length} rides currently shown in this seeded MVP.
        </p>
      </section>
    </AppShell>
  );
}
