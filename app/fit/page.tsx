import { FitHistoryManager } from "@/components/fit/FitHistoryManager";
import { FitMeasurementForm } from "@/components/fit/FitMeasurementForm";
import { FitSnapshot } from "@/components/fit/FitSnapshot";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { OrbitDial } from "@/components/ui/viz/OrbitDial";
import { PillBars } from "@/components/ui/viz/PillBars";
import { WaveSparkline } from "@/components/ui/viz/WaveSparkline";
import { requireServerUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOwnedBikeId } from "@/lib/ownership";

export const dynamic = "force-dynamic";

async function getFitPageData(userId: string) {
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
        fitMeasurements: {
          orderBy: {
            date: "desc",
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

export default async function FitPage() {
  const user = await requireServerUser();
  const data = await getFitPageData(user.id);
  const bike = data.bike;

  const currentMeasurement =
    bike?.fitMeasurements.find((measurement) => measurement.isCurrent) ??
    bike?.fitMeasurements[0];
  const history = bike?.fitMeasurements ?? [];
  const saddleSeries = [...history]
    .reverse()
    .map((measurement) => measurement.saddleHeightMm)
    .filter((value): value is number => typeof value === "number");
  const reachSeries = [...history]
    .reverse()
    .map((measurement) => measurement.reachToHoodsMm)
    .filter((value): value is number => typeof value === "number");
  const currentMetricBars = [
    { label: "Saddle height", value: currentMeasurement?.saddleHeightMm ?? 0, hint: "mm" },
    { label: "Saddle setback", value: currentMeasurement?.saddleSetbackMm ?? 0, hint: "mm" },
    { label: "Stem length", value: currentMeasurement?.stemLengthMm ?? 0, hint: "mm" },
    { label: "Bar width", value: currentMeasurement?.handlebarWidthMm ?? 0, hint: "mm" },
    { label: "Reach to hoods", value: currentMeasurement?.reachToHoodsMm ?? 0, hint: "mm" },
  ].filter((item) => item.value > 0);
  const saddleRange =
    saddleSeries.length > 1 ? Math.max(...saddleSeries) - Math.min(...saddleSeries) : 0;
  const fitConsistencyScore = Math.max(0, Math.min(100, 100 - saddleRange * 2.4));

  return (
    <AppShell title="Bike Fit" description="Store your setup measurements and keep fit history organized.">
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
          <section className="mb-6 grid gap-4 xl:grid-cols-3">
            <OrbitDial
              label="Fit Consistency"
              value={fitConsistencyScore}
              suffix="%"
              hint={
                saddleSeries.length > 1
                  ? `Saddle height variation: ${saddleRange.toFixed(1)} mm`
                  : "Add more measurements for consistency tracking."
              }
              tone={fitConsistencyScore >= 85 ? "emerald" : "orange"}
            />
            <WaveSparkline
              title="Saddle Height Wave"
              values={saddleSeries}
              valueLabel={`${saddleSeries.length} samples`}
              subtitle="History of saddle height adjustments."
              tone="emerald"
            />
            <WaveSparkline
              title="Reach Wave"
              values={reachSeries}
              valueLabel={`${reachSeries.length} samples`}
              subtitle="History of reach-to-hoods adjustments."
              tone="sky"
            />
          </section>

          <section className="mb-6">
            <PillBars
              title="Current Fit Metric Stack"
              items={currentMetricBars}
              valueSuffix=" mm"
              tone="sky"
            />
          </section>

          <FitSnapshot
            saddleHeightMm={currentMeasurement?.saddleHeightMm ?? undefined}
            saddleSetbackMm={currentMeasurement?.saddleSetbackMm ?? undefined}
            stemLengthMm={currentMeasurement?.stemLengthMm ?? undefined}
            handlebarWidthMm={currentMeasurement?.handlebarWidthMm ?? undefined}
            crankLengthMm={currentMeasurement?.crankLengthMm ?? undefined}
            spacerStackMm={currentMeasurement?.spacerStackMm ?? undefined}
            reachToHoodsMm={currentMeasurement?.reachToHoodsMm ?? undefined}
            notes={currentMeasurement?.notes ?? undefined}
          />

          <section className="mt-6">
            <FitMeasurementForm bikeId={bike.id} disabled={!data.dbConnected} />
          </section>

          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900">Fit history</h2>
            <div className="mt-3">
              <FitHistoryManager
                measurements={bike.fitMeasurements.map((measurement) => ({
                  id: measurement.id,
                  date: measurement.date.toISOString(),
                  saddleHeightMm: measurement.saddleHeightMm,
                  saddleSetbackMm: measurement.saddleSetbackMm,
                  saddleTiltDeg: measurement.saddleTiltDeg,
                  stemLengthMm: measurement.stemLengthMm,
                  handlebarWidthMm: measurement.handlebarWidthMm,
                  crankLengthMm: measurement.crankLengthMm,
                  spacerStackMm: measurement.spacerStackMm,
                  reachToHoodsMm: measurement.reachToHoodsMm,
                  cleatNotes: measurement.cleatNotes,
                  notes: measurement.notes,
                  isCurrent: measurement.isCurrent,
                }))}
                disabled={!data.dbConnected}
              />
            </div>
          </section>
        </>
      ) : (
        <EmptyState
          title="No bike data yet"
          description="Seed the default bike first, then add fit measurements here."
        />
      )}
    </AppShell>
  );
}
