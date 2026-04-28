import { AppShell } from "@/components/layout/AppShell";
import { Checklist } from "@/components/checklist/Checklist";
import { mockChecklistItems } from "@/lib/mock-data";

export default function ChecklistPage() {
  return (
    <AppShell title="Checklist" description="Before-ride readiness checks and custom prep items.">
      <Checklist initialItems={mockChecklistItems} />
    </AppShell>
  );
}
