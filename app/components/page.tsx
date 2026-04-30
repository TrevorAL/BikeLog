import type { ComponentType } from "@prisma/client";

import { ComponentManager } from "@/components/components/ComponentManager";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { OrbitDial } from "@/components/ui/viz/OrbitDial";
import { PillBars } from "@/components/ui/viz/PillBars";
import { requireServerUser } from "@/lib/auth";
import { computeBikeMaintenance } from "@/lib/bike-maintenance";
import { formatComponentType } from "@/lib/component-options";
import { MAINTENANCE_INTERVALS, type MaintenanceStatus } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { getOwnedBikeId } from "@/lib/ownership";

export const dynamic = "force-dynamic";

type ComponentsPageProps = {
  searchParams?: Promise<{
    open?: string;
  }>;
};

const maintenanceKeyByComponentType: Partial<Record<ComponentType, string>> = {
  CHAIN: "chain-lube",
  CASSETTE: "cassette-inspect",
  FRONT_TIRE: "tire-inspect",
  REAR_TIRE: "tire-inspect",
  FRONT_BRAKE_PAD: "brake-inspect",
  REAR_BRAKE_PAD: "brake-inspect",
  FRONT_ROTOR: "rotor-inspect",
  REAR_ROTOR: "rotor-inspect",
  CHAINRINGS: "chain-wear",
  CLEATS: "cleat-inspect",
  BAR_TAPE: "bar-tape-inspect",
  DI2_BATTERY: "di2-charge",
};

const mileageIntervalByMaintenanceKey: Record<string, number> = {
  "chain-lube": MAINTENANCE_INTERVALS.chainLube.intervalMiles,
  "chain-wear": MAINTENANCE_INTERVALS.chainWear.intervalMiles,
  "tire-inspect": MAINTENANCE_INTERVALS.tireInspection.intervalMiles,
  "brake-inspect": MAINTENANCE_INTERVALS.brakePadInspection.intervalMiles,
  "cleat-inspect": MAINTENANCE_INTERVALS.cleatInspection.intervalMiles,
  "bar-tape-inspect": MAINTENANCE_INTERVALS.barTapeInspection.intervalMiles,
  "cassette-inspect": MAINTENANCE_INTERVALS.cassetteInspection.intervalMiles,
  "rotor-inspect": MAINTENANCE_INTERVALS.rotorInspection.intervalMiles,
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function getProgressToService(input: {
  detail: string;
  intervalMiles: number;
  status: "GOOD" | "DUE_SOON" | "DUE_NOW" | "OVERDUE";
}) {
  if (input.detail.toLowerCase() === "due now") {
    return 100;
  }

  const remainingMatch = input.detail.match(/^([0-9]+(?:\.[0-9]+)?) miles remaining$/i);
  if (remainingMatch) {
    const milesRemaining = Number(remainingMatch[1]);
    return clampPercent(((input.intervalMiles - milesRemaining) / input.intervalMiles) * 100);
  }

  const overdueMatch = input.detail.match(/^([0-9]+(?:\.[0-9]+)?) miles overdue$/i);
  if (overdueMatch) {
    return 100;
  }

  if (input.status === "DUE_NOW" || input.status === "OVERDUE") {
    return 100;
  }

  if (input.status === "DUE_SOON") {
    return 85;
  }

  return 0;
}

async function getComponentsPageData(userId: string) {
  try {
    const bikeId = await getOwnedBikeId({ userId });
    if (!bikeId) {
      return {
        bike: undefined,
        dbConnected: true,
      };
    }

    const bike = await prisma.bike.findUnique({
      where: {
        id: bikeId,
      },
      select: {
        id: true,
        components: {
          where: {
            isActive: true,
          },
          orderBy: {
            name: "asc",
          },
        },
        rides: {
          select: {
            distanceMiles: true,
            durationMinutes: true,
            date: true,
            wasWet: true,
            roadCondition: true,
          },
          orderBy: {
            date: "desc",
          },
        },
        maintenanceEvents: {
          select: {
            type: true,
            date: true,
            mileageAtService: true,
            notes: true,
          },
          orderBy: {
            date: "desc",
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

export default async function ComponentsPage({ searchParams }: ComponentsPageProps) {
  const user = await requireServerUser();
  const openQuery = (await searchParams)?.open?.toLowerCase();
  const shouldOpenAddForm = openQuery === "add" || openQuery === "true" || openQuery === "1";
  const data = await getComponentsPageData(user.id);
  const bike = data.bike;

  const dueItemMap = new Map(
    bike
      ? data.maintenance.maintenanceSummary.dueItems.map((item) => [item.key, item] as const)
      : [],
  );
  const mileageBars = bike
    ? [...bike.components]
        .sort((a, b) => b.currentMileage - a.currentMileage)
        .slice(0, 8)
        .map((component) => ({
          label: component.name,
          value: component.currentMileage,
          hint: formatComponentType(component.type),
        }))
    : [];
  const componentMileageLoadBars = bike
    ? [...bike.components]
        .map((component) => {
          const maintenanceKey = maintenanceKeyByComponentType[component.type];
          if (!maintenanceKey) {
            return null;
          }

          const dueItem = dueItemMap.get(maintenanceKey);
          const intervalMiles = mileageIntervalByMaintenanceKey[maintenanceKey];
          if (!dueItem || !intervalMiles) {
            return null;
          }

          return {
            label: component.name,
            value: getProgressToService({
              detail: dueItem.detail,
              intervalMiles,
              status: dueItem.status,
            }),
            hint: dueItem.detail,
          };
        })
        .filter(
          (bar): bar is { label: string; value: number; hint: string } =>
            Boolean(bar),
        )
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)
    : [];
  const dueNowCount = bike ? data.maintenance.maintenanceSummary.dueNow.length : 0;
  const dueSoonCount = bike ? data.maintenance.maintenanceSummary.dueSoon.length : 0;

  return (
    <AppShell title="Components" description="Track wear and mileage for every major part.">
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
          <section className="mb-6 grid gap-4 xl:grid-cols-[280px_minmax(0,_1fr)_minmax(0,_1fr)]">
            <div className="h-full">
              <OrbitDial
                label="Component Health"
                value={Math.max(0, 100 - dueNowCount * 18 - dueSoonCount * 8)}
                suffix="%"
                hint={`${dueNowCount} due now · ${dueSoonCount} due soon`}
                tone={dueNowCount > 0 ? "orange" : "emerald"}
                size={128}
              />
            </div>
            <PillBars
              title="Top Mileage Components"
              items={mileageBars}
              valueSuffix=" mi"
              tone="sky"
              scrollable
              className="h-full"
              listMaxHeightClassName="max-h-[260px] overflow-y-auto pr-1"
            />
            <PillBars
              title="Component Mileage Load"
              items={componentMileageLoadBars}
              valueSuffix="%"
              tone="orange"
              maxValue={100}
              minBarPercent={0}
              scrollable
              className="h-full"
              listMaxHeightClassName="max-h-[260px] overflow-y-auto pr-1"
              headerAction={<span className="text-xs font-medium text-slate-500">Miles Until Inspection</span>}
            />
          </section>

          <ComponentManager
            bikeId={bike.id}
            disabled={!data.dbConnected}
            initialShowAddForm={shouldOpenAddForm}
            components={bike.components.map((component) => {
              const maintenanceKey = maintenanceKeyByComponentType[component.type];
              const dueItem = maintenanceKey ? dueItemMap.get(maintenanceKey) : undefined;
              const conditionStatus = (dueItem?.status ?? "GOOD") as MaintenanceStatus;
              const nextMaintenance = dueItem
                ? `${dueItem.label}: ${dueItem.detail}`
                : "No immediate action";

              return {
                id: component.id,
                type: component.type,
                name: component.name,
                brand: component.brand,
                model: component.model,
                installDate: component.installDate?.toISOString() ?? null,
                initialMileage: component.initialMileage,
                currentMileage: component.currentMileage,
                notes: component.notes,
                conditionStatus,
                nextMaintenance,
              };
            })}
          />
        </>
      ) : (
        <EmptyState
          title="No bike data yet"
          description="Seed the default bike first, then add and manage components here."
        />
      )}
    </AppShell>
  );
}
