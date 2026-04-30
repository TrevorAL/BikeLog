import { AppShell } from "@/components/layout/AppShell";
import { PressureCalculator } from "@/components/pressure/PressureCalculator";
import { PressurePresetManager } from "@/components/pressure/PressurePresetManager";
import { OrbitDial } from "@/components/ui/viz/OrbitDial";
import { PillBars } from "@/components/ui/viz/PillBars";
import { WaveSparkline } from "@/components/ui/viz/WaveSparkline";
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
  const presets = bike?.pressureSetups ?? [];
  const frontSeries = [...presets.slice(0, 12)].reverse().map((preset) => preset.frontPsi);
  const rearSeries = [...presets.slice(0, 12)].reverse().map((preset) => preset.rearPsi);
  const frontAverage =
    frontSeries.length > 0
      ? frontSeries.reduce((sum, value) => sum + value, 0) / frontSeries.length
      : 0;
  const rearAverage =
    rearSeries.length > 0
      ? rearSeries.reduce((sum, value) => sum + value, 0) / rearSeries.length
      : 0;
  const surfaceCountMap = new Map<string, number>();
  for (const preset of presets) {
    const key = preset.surface.replaceAll("_", " ");
    surfaceCountMap.set(key, (surfaceCountMap.get(key) ?? 0) + 1);
  }
  const surfaceBars = Array.from(surfaceCountMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value }));

  return (
    <AppShell
      title="Tire Pressure"
      description="Find and save pressure setups by surface and ride preference."
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

      <section className="mb-6 grid gap-4 xl:grid-cols-3">
        <OrbitDial
          label="Front PSI Orbit"
          value={frontAverage}
          min={50}
          max={100}
          suffix=" psi"
          hint={presets[0] ? `Latest: ${Math.round(presets[0].frontPsi)} psi` : "No presets yet"}
          tone="sky"
        />
        <OrbitDial
          label="Rear PSI Orbit"
          value={rearAverage}
          min={55}
          max={105}
          suffix=" psi"
          hint={presets[0] ? `Latest: ${Math.round(presets[0].rearPsi)} psi` : "No presets yet"}
          tone="orange"
        />
        <PillBars title="Surface Preset Mix" items={surfaceBars} tone="emerald" />
      </section>

      <section className="mb-6 grid gap-4 xl:grid-cols-2">
        <WaveSparkline
          title="Front Pressure Trend"
          values={frontSeries}
          valueLabel={`${frontSeries.length} samples`}
          subtitle="Trend across your most recently updated presets."
          tone="sky"
        />
        <WaveSparkline
          title="Rear Pressure Trend"
          values={rearSeries}
          valueLabel={`${rearSeries.length} samples`}
          subtitle="Rear pressure trend for saved setups."
          tone="orange"
        />
      </section>

      <PressureCalculator bikeId={bike?.id} disabled={!bike || !data.dbConnected} />

      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900">Saved presets</h2>
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
