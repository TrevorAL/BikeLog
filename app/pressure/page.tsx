import { AppShell } from "@/components/layout/AppShell";
import { PressureCalculator } from "@/components/pressure/PressureCalculator";
import { PressurePresetManager } from "@/components/pressure/PressurePresetManager";
import { requireServerUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOwnedBikeId } from "@/lib/ownership";

export const dynamic = "force-dynamic";

async function getPressurePageData(userId: string) {
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
        pressureSetups: {
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            name: true,
            riderWeightLbs: true,
            bikeWeightLbs: true,
            gearWeightLbs: true,
            frontTireWidthMm: true,
            rearTireWidthMm: true,
            tubeless: true,
            surface: true,
            preference: true,
            frontPsi: true,
            rearPsi: true,
            notes: true,
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

export default async function PressurePage() {
  const user = await requireServerUser();
  const data = await getPressurePageData(user.id);
  const bike = data.bike;

  return (
    <AppShell
      title="Tire Pressure"
      description="Find and save pressure setups by surface and ride preference."
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

      <PressureCalculator bikeId={bike?.id} disabled={!bike || !data.dbConnected} />

      <section className="mt-6">
        <h2 className="font-display text-xl font-semibold text-orange-950">Saved presets</h2>
        <div className="mt-3">
          <PressurePresetManager
            presets={
              bike?.pressureSetups.map((preset) => ({
                id: preset.id,
                name: preset.name,
                riderWeightLbs: preset.riderWeightLbs,
                bikeWeightLbs: preset.bikeWeightLbs,
                gearWeightLbs: preset.gearWeightLbs,
                frontTireWidthMm: preset.frontTireWidthMm,
                rearTireWidthMm: preset.rearTireWidthMm,
                tubeless: preset.tubeless,
                surface: preset.surface,
                preference: preset.preference,
                frontPsi: preset.frontPsi,
                rearPsi: preset.rearPsi,
                notes: preset.notes,
              })) ?? []
            }
            disabled={!bike || !data.dbConnected}
          />
        </div>
      </section>
    </AppShell>
  );
}
