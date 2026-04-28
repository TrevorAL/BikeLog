import { AppShell } from "@/components/layout/AppShell";
import { DueSoonList } from "@/components/maintenance/DueSoonList";
import { MaintenanceEventCard } from "@/components/maintenance/MaintenanceEventCard";
import { MaintenanceForm } from "@/components/maintenance/MaintenanceForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { computeBikeMaintenance } from "@/lib/bike-maintenance";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getMaintenancePageData() {
  try {
    const bike = await prisma.bike.findFirst({
      orderBy: {
        createdAt: "asc",
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

export default async function MaintenancePage() {
  const data = await getMaintenancePageData();
  const bike = data.bike;
  const maintenance = bike ? data.maintenance : undefined;

  return (
    <AppShell
      title="Maintenance"
      description="Due now, due soon, condition-based suggestions, and full service history."
    >
      {!data.dbConnected ? (
        <section className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800 shadow-warm">
          <h2 className="font-display text-xl font-semibold">Database not connected</h2>
          <p className="mt-2 text-sm">
            Set <code>DATABASE_URL</code>, run <code>npm run db:push</code>, and then{" "}
            <code>npm run db:seed</code>.
          </p>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <DueSoonList title="Due now / overdue" items={maintenance?.maintenanceSummary.dueNow ?? []} />
        <DueSoonList title="Due soon" items={maintenance?.maintenanceSummary.dueSoon ?? []} />
      </section>

      <section className="mt-6 rounded-3xl border border-orange-200 bg-white p-5 shadow-warm">
        <h2 className="font-display text-xl font-semibold text-orange-950">Condition-based suggestions</h2>
        {maintenance?.maintenanceSummary.suggestions.length ? (
          <ul className="mt-3 space-y-2">
            {maintenance.maintenanceSummary.suggestions.map((suggestion) => (
              <li
                key={suggestion}
                className="rounded-2xl border border-orange-100 bg-orange-50/70 px-3 py-2 text-sm text-orange-900/80"
              >
                {suggestion}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-orange-900/70">No suggestions from recent ride conditions.</p>
        )}
      </section>

      <section className="mt-6">
        <MaintenanceForm
          bikeId={bike?.id}
          components={bike?.components.map((component) => ({
            id: component.id,
            name: component.name,
          })) ?? []}
          disabled={!data.dbConnected || !bike}
        />
      </section>

      <section className="mt-6">
        <h2 className="font-display text-xl font-semibold text-orange-950">Maintenance history</h2>
        <div className="mt-3 grid gap-4 xl:grid-cols-2">
          {bike && bike.maintenanceEvents.length > 0 ? (
            bike.maintenanceEvents.map((event) => (
              <MaintenanceEventCard
                key={event.id}
                date={event.date}
                type={event.type}
                mileageAtService={event.mileageAtService ?? undefined}
                notes={event.notes ?? undefined}
                componentName={event.component?.name}
              />
            ))
          ) : (
            <EmptyState
              title="No maintenance events yet"
              description="Log your first maintenance event to start tracking service history."
            />
          )}
        </div>
      </section>
    </AppShell>
  );
}
