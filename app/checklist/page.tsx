import { Checklist } from "@/components/checklist/Checklist";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { OrbitDial } from "@/components/ui/viz/OrbitDial";
import { PillBars } from "@/components/ui/viz/PillBars";
import { requireServerUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOwnedBikeId } from "@/lib/ownership";

export const dynamic = "force-dynamic";

async function getChecklistPageData(userId: string) {
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
  const user = await requireServerUser();
  const data = await getChecklistPageData(user.id);
  const bike = data.bike;
  const items = bike?.checklistItems ?? [];
  const completedCount = items.filter((item) => item.completed).length;
  const pendingCount = Math.max(0, items.length - completedCount);
  const defaultCount = items.filter((item) => item.isDefault).length;
  const customCount = Math.max(0, items.length - defaultCount);
  const completionPercent = items.length > 0 ? (completedCount / items.length) * 100 : 0;
  const checklistBars = [
    { label: "Completed", value: completedCount },
    { label: "Pending", value: pendingCount },
    { label: "Default items", value: defaultCount },
    { label: "Custom items", value: customCount },
  ];

  return (
    <AppShell title="Checklist" description="Before-ride readiness checks and custom prep items.">
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
          <section className="mb-6 grid gap-4 xl:grid-cols-2">
            <OrbitDial
              label="Checklist Completion"
              value={completionPercent}
              suffix="%"
              hint={`${completedCount}/${items.length} items complete`}
              tone={completionPercent >= 80 ? "emerald" : "sky"}
            />
            <PillBars title="Checklist Breakdown" items={checklistBars} tone="emerald" />
          </section>

          <Checklist
            bikeId={bike.id}
            initialItems={bike.checklistItems}
            disabled={!data.dbConnected}
          />
        </>
      ) : (
        <EmptyState
          title="No bike data yet"
          description="Seed the default bike first, then manage your checklist here."
        />
      )}
    </AppShell>
  );
}
