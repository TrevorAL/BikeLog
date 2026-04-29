import type { ComponentType } from "@prisma/client";

import { ComponentManager } from "@/components/components/ComponentManager";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireServerUser } from "@/lib/auth";
import { computeBikeMaintenance } from "@/lib/bike-maintenance";
import type { MaintenanceStatus } from "@/lib/constants";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

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

async function getComponentsPageData(userId: string) {
  try {
    const bike = await prisma.bike.findFirst({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "asc",
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

export default async function ComponentsPage() {
  const user = await requireServerUser();
  const data = await getComponentsPageData(user.id);
  const bike = data.bike;

  const dueItemMap = new Map(
    bike
      ? data.maintenance.maintenanceSummary.dueItems.map((item) => [item.key, item] as const)
      : [],
  );

  return (
    <AppShell title="Components" description="Track wear and mileage for every major part.">
      {!data.dbConnected ? (
        <section className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800 shadow-warm">
          <h2 className="font-display text-xl font-semibold">Database not connected</h2>
          <p className="mt-2 text-sm">
            Set <code>DATABASE_URL</code>, run <code>npm run db:push</code>, and then{" "}
            <code>npm run db:seed</code>.
          </p>
        </section>
      ) : null}

      {bike ? (
        <ComponentManager
          bikeId={bike.id}
          disabled={!data.dbConnected}
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
      ) : (
        <EmptyState
          title="No bike data yet"
          description="Seed the default bike first, then add and manage components here."
        />
      )}
    </AppShell>
  );
}
