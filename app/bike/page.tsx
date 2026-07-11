import Link from "next/link";

import { BikeManager } from "@/components/bike/BikeManager";
import { BikePhotoUploader } from "@/components/bike/BikePhotoUploader";
import { ShareHistorySection } from "@/components/bike/ShareHistorySection";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricCard } from "@/components/ui/MetricCard";
import { QuickActionsDropdown } from "@/components/ui/QuickActionsDropdown";
import { requireServerUser } from "@/lib/auth";
import { computeBikeMaintenance } from "@/lib/bike-maintenance";
import { prisma } from "@/lib/db";
import { getOwnedBikeId } from "@/lib/ownership";
import { getReadinessTone, type ReadinessTone } from "@/lib/readiness";

const READINESS_CHIP_CLASSES: Record<ReadinessTone, string> = {
  good: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  warning: "bg-amber-50 text-amber-800 ring-amber-600/20",
  attention: "bg-red-50 text-red-700 ring-red-600/20",
};

export const dynamic = "force-dynamic";

type BikePageProps = {
  searchParams?: Promise<{
    editBikeId?: string;
    openAddBike?: string;
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
        imageUrl: true,
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
        purchasePrice: true,
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
  const resolvedSearchParams = await searchParams;
  const requestedEditBikeId = resolvedSearchParams?.editBikeId;
  const openAddBikeQuery = resolvedSearchParams?.openAddBike?.toLowerCase();
  const shouldOpenAddBikeForm =
    openAddBikeQuery === "1" || openAddBikeQuery === "true" || openAddBikeQuery === "add";
  const initialEditingBikeId =
    requestedEditBikeId &&
    data.bikes.some((candidate) => candidate.id === requestedEditBikeId && !candidate.isArchived)
      ? requestedEditBikeId
      : undefined;
  const bike = data.bike;

  const lastRide = bike?.rides[0];
  const lastService = bike?.maintenanceEvents[0];
  const headline = bike ? [bike.year, bike.brand, bike.model].filter(Boolean).join(" ") : "";
  const readinessTone = getReadinessTone(bike ? data.maintenance.readiness.score : 0);
  const editBikeHref = bike
    ? `/bike?editBikeId=${encodeURIComponent(bike.id)}#bike-manager`
    : "/bike#bike-manager";
  const quickActions = [
    { href: editBikeHref, label: "Edit Bike" },
    { href: "/bike?openAddBike=1#bike-manager", label: "Add Bike" },
    { href: "/components?open=add#add-component-form", label: "Add Component" },
    { href: "/rides?open=log#ride-log-form", label: "Log Ride" },
    { href: "/maintenance?open=log#maintenance-log-form", label: "Log Maintenance" },
    { href: "/fit/bike?open=add#fit-measurement-form", label: "Add Fit Measurement" },
  ];

  return (
    <AppShell
      title="Bike Profile"
      description="Main bike details and quick stats."
      actions={<QuickActionsDropdown items={quickActions} />}
    >
      {!data.dbConnected ? (
        <section className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800 shadow-card">
          <h2 className="font-display text-lg font-semibold tracking-tight">Database not connected</h2>
          <p className="mt-2 text-sm">
            Set <code>DATABASE_URL</code>, run <code>npm run db:push</code>, and then{" "}
            <code>npm run db:seed</code>.
          </p>
        </section>
      ) : null}

      {bike ? (
        <>
          <section className="surface-card overflow-hidden">
            <div className="grid lg:grid-cols-[minmax(0,_2fr)_minmax(0,_3fr)]">
              <BikePhotoUploader
                bikeId={bike.id}
                imageUrl={bike.imageUrl}
                bikeName={bike.name}
                className="lg:h-full"
              />

              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Primary bike{bike.type ? ` · ${bike.type}` : ""}
                    </p>
                    <h2 className="font-display mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                      {headline || bike.name}
                    </h2>
                    {headline && headline !== bike.name ? (
                      <p className="mt-0.5 text-sm text-slate-500">{bike.name}</p>
                    ) : null}
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${READINESS_CHIP_CLASSES[readinessTone]}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                    {data.maintenance.readiness.score}% · {data.maintenance.readiness.label}
                  </span>
                </div>

                <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                  {[
                    { label: "Frame", value: bike.frameMaterial },
                    { label: "Size", value: bike.frameSize },
                    { label: "Drivetrain", value: bike.drivetrain },
                    { label: "Brakes", value: bike.brakeType },
                    { label: "Wheelset", value: bike.wheelset },
                    { label: "Tires", value: bike.tireSetup },
                  ].map((spec) => (
                    <div key={spec.label} className="min-w-0">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {spec.label}
                      </dt>
                      <dd
                        className={`mt-0.5 truncate text-sm font-semibold ${
                          spec.value ? "text-slate-900" : "font-normal text-slate-400"
                        }`}
                        title={spec.value ?? undefined}
                      >
                        {spec.value ?? "Not set"}
                      </dd>
                    </div>
                  ))}
                </dl>

                {bike.notes ? (
                  <p className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">
                    {bike.notes}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/rides" className="block rounded-2xl transition hover:opacity-80">
              <MetricCard
                title="Total Miles"
                value={`${data.maintenance.bikeMileage.toFixed(1)} mi`}
                subtitle={
                  lastRide
                    ? `Last ride ${lastRide.date.toLocaleDateString()} · ${lastRide.distanceMiles.toFixed(1)} mi`
                    : "No rides logged yet"
                }
                className="h-full"
              />
            </Link>
            <Link href="/components" className="block rounded-2xl transition hover:opacity-80">
              <MetricCard
                title="Active Components"
                value={`${bike.components.length}`}
                subtitle="Tracked for wear"
                className="h-full"
              />
            </Link>
            <Link href="/maintenance" className="block rounded-2xl transition hover:opacity-80">
              <MetricCard
                title="Maintenance Due"
                value={`${data.maintenance.maintenanceSummary.dueNow.length}`}
                subtitle={`${data.maintenance.maintenanceSummary.dueSoon.length} due soon`}
                className="h-full"
              />
            </Link>
            <Link href="/maintenance" className="block rounded-2xl transition hover:opacity-80">
              <MetricCard
                title="Last Service"
                value={lastService ? lastService.date.toLocaleDateString() : "None yet"}
                subtitle={
                  lastService
                    ? lastService.type.replaceAll("_", " ").toLowerCase()
                    : "Log maintenance to start history"
                }
                className="h-full"
              />
            </Link>
          </section>
        </>
      ) : (
        <EmptyState
          title="No active bike selected"
          description="Create a new bike or restore an archived bike below."
        />
      )}

      {bike ? (
        <section
          id="share-history"
          className="surface-card mt-6 scroll-mt-40 p-5"
        >
          <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900">
            Service history &amp; resale
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Share a public, no-login link to this bike&apos;s full service history — specs,
            components, prices, and maintenance log — or open it and use Download / Print to save a
            PDF for a buyer.
          </p>
          <ShareHistorySection bikes={data.bikes} defaultBikeId={bike.id} />
        </section>
      ) : null}

      <section id="bike-manager" className="mt-6 scroll-mt-40">
        <BikeManager
          key={`${bike?.id ?? "none"}:${initialEditingBikeId ?? "none"}:${shouldOpenAddBikeForm ? "open" : "closed"}`}
          bikes={data.bikes}
          selectedBikeId={bike?.id}
          initialEditingBikeId={initialEditingBikeId}
          initialShowAddForm={shouldOpenAddBikeForm}
        />
      </section>
    </AppShell>
  );
}
