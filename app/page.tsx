import Link from "next/link";
import { ArrowRight, LayoutDashboard } from "lucide-react";

import { GarageScene } from "@/components/garage/GarageScene";
import { MetricCard } from "@/components/ui/MetricCard";
import {
  bikeMileageTotal,
  maintenanceSummary,
  mockPressureRecommendation,
  mockReadiness,
} from "@/lib/mock-data";

export default function HomePage() {
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

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Ready to Ride" value={`${mockReadiness.score}%`} subtitle={mockReadiness.label} />
            <MetricCard title="Total Logged Miles" value={`${bikeMileageTotal.toFixed(1)} mi`} subtitle="Across recent rides" />
            <MetricCard
              title="Pressure Today"
              value={`${mockPressureRecommendation.frontPsi}/${mockPressureRecommendation.rearPsi} PSI`}
              subtitle="Front / Rear"
            />
            <MetricCard
              title="Maintenance Alerts"
              value={`${maintenanceSummary.dueNow.length}`}
              subtitle="Due now or overdue"
            />
          </div>
        </header>

        <GarageScene />
      </div>
    </div>
  );
}
