import { AppShell } from "@/components/layout/AppShell";
import { DueSoonList } from "@/components/maintenance/DueSoonList";
import { MaintenanceEventCard } from "@/components/maintenance/MaintenanceEventCard";
import { MaintenanceForm } from "@/components/maintenance/MaintenanceForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { maintenanceSummary, mockMaintenanceEvents } from "@/lib/mock-data";

export default function MaintenancePage() {
  return (
    <AppShell title="Maintenance" description="Due now, due soon, suggested checks, and service history.">
      <section className="grid gap-4 lg:grid-cols-2">
        <DueSoonList title="Due now" items={maintenanceSummary.dueNow} />
        <DueSoonList title="Due soon" items={maintenanceSummary.dueSoon} />
      </section>

      <section className="mt-6 rounded-3xl border border-orange-200 bg-white p-5 shadow-warm">
        <h2 className="font-display text-xl font-semibold text-orange-950">Condition-based suggestions</h2>
        {maintenanceSummary.suggestions.length === 0 ? (
          <p className="mt-2 text-sm text-orange-900/70">No suggestions from recent ride conditions.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {maintenanceSummary.suggestions.map((suggestion) => (
              <li
                key={suggestion}
                className="rounded-2xl border border-orange-100 bg-orange-50/70 px-3 py-2 text-sm text-orange-900/80"
              >
                {suggestion}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <MaintenanceForm />
      </section>

      <section className="mt-6">
        <h2 className="font-display text-xl font-semibold text-orange-950">Maintenance history</h2>
        <div className="mt-3 grid gap-4 xl:grid-cols-2">
          {mockMaintenanceEvents.length > 0 ? (
            mockMaintenanceEvents.map((event) => <MaintenanceEventCard key={event.id} {...event} />)
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
