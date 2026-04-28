import { AppShell } from "@/components/layout/AppShell";
import { ComponentCard } from "@/components/components/ComponentCard";
import { mockComponents } from "@/lib/mock-data";

export default function ComponentsPage() {
  return (
    <AppShell title="Components" description="Track wear and mileage for every major part.">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {mockComponents.map((component) => (
          <ComponentCard
            key={component.id}
            name={component.name}
            brandModel={component.brandModel}
            currentMileage={component.currentMileage}
            installDate={component.installDate}
            conditionStatus={component.conditionStatus}
            nextMaintenance={component.nextMaintenance}
          />
        ))}
      </section>
    </AppShell>
  );
}
