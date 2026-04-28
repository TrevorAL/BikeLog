import { Checklist } from "@/components/checklist/Checklist";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getChecklistPageData() {
  try {
    const bike = await prisma.bike.findFirst({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        checklistItems: {
          orderBy: [
            { sortOrder: "asc" },
            { createdAt: "asc" },
          ],
          select: {
            id: true,
            label: true,
            completed: true,
            isDefault: true,
          },
        },
      },
    });

    return {
      bike,
      dbConnected: true,
    };
  } catch {
    return {
      bike: undefined,
      dbConnected: false,
    };
  }
}

export default async function ChecklistPage() {
  const data = await getChecklistPageData();
  const bike = data.bike;

  return (
    <AppShell title="Checklist" description="Before-ride readiness checks and custom prep items.">
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
        <Checklist
          bikeId={bike.id}
          initialItems={bike.checklistItems}
          disabled={!data.dbConnected}
        />
      ) : (
        <EmptyState
          title="No bike data yet"
          description="Seed the default bike first, then manage your checklist here."
        />
      )}
    </AppShell>
  );
}
