import { AppShell } from "@/components/layout/AppShell";
import { MaintenanceWorkspace } from "@/components/maintenance/MaintenanceWorkspace";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireServerUser } from "@/lib/auth";
import { computeBikeMaintenance } from "@/lib/bike-maintenance";
import { prisma } from "@/lib/db";
import { getOwnedBikeId } from "@/lib/ownership";

export const dynamic = "force-dynamic";

type MaintenancePageProps = {
  searchParams?: Promise<{
    due?: string;
  }>;
};

async function getMaintenancePageData(userId: string) {
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
        name: true,
        components: {
          where: {
            isActive: true,
          },
          orderBy: {
            name: "asc",
          },
          select: {
            id: true,
            name: true,
            type: true,
            currentMileage: true,
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
          orderBy: {
            date: "desc",
          },
          include: {
            component: {
              select: {
                id: true,
                name: true,
              },
            },
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

export default async function MaintenancePage({ searchParams }: MaintenancePageProps) {
  const user = await requireServerUser();
  const dueFromQuery = (await searchParams)?.due;
  const data = await getMaintenancePageData(user.id);
  const bike = data.bike;
  const maintenance = bike ? data.maintenance : undefined;

  return (
    <AppShell
      title="Maintenance"
      description="Due now, due soon, condition-based suggestions, and full service history."
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
          <MaintenanceWorkspace
            bikeId={bike.id}
            bikeCurrentMileage={maintenance?.bikeMileage ?? 0}
            dueNowItems={maintenance?.maintenanceSummary.dueNow ?? []}
            dueSoonItems={maintenance?.maintenanceSummary.dueSoon ?? []}
            suggestions={maintenance?.maintenanceSummary.suggestions ?? []}
            initialDueKey={typeof dueFromQuery === "string" ? dueFromQuery : undefined}
            components={bike.components.map((component) => ({
              id: component.id,
              name: component.name,
              type: component.type,
              currentMileage: component.currentMileage,
            }))}
            events={bike.maintenanceEvents.map((event) => ({
              id: event.id,
              date: event.date.toISOString(),
              type: event.type,
              mileageAtService: event.mileageAtService,
              notes: event.notes,
              componentId: event.componentId,
              componentName: event.component?.name,
            }))}
            disabled={!data.dbConnected}
          />
        </>
      ) : (
        <section className="mt-6">
          <EmptyState
            title="No bike data yet"
            description="Seed the default bike first, then log maintenance here."
          />
        </section>
      )}
    </AppShell>
  );
}
