import { FitHistoryManager } from "@/components/fit/FitHistoryManager";
import { FitMeasurementForm } from "@/components/fit/FitMeasurementForm";
import { FitSnapshot } from "@/components/fit/FitSnapshot";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireServerUser } from "@/lib/auth";
import { getFitPageData } from "@/lib/fit-page-data";

export const dynamic = "force-dynamic";

type BikeFitPageProps = {
  searchParams?: Promise<{
    open?: string;
  }>;
};

export default async function BikeFitPage({ searchParams }: BikeFitPageProps) {
  const user = await requireServerUser();
  const openQuery = (await searchParams)?.open?.toLowerCase();
  const shouldOpenAddMeasurementForm =
    openQuery === "1" || openQuery === "true" || openQuery === "add";
  const data = await getFitPageData(user.id);
  const bike = data.bike;

  const currentMeasurement =
    bike?.fitMeasurements.find((measurement) => measurement.isCurrent) ??
    bike?.fitMeasurements[0];

  return (
    <AppShell
      title="Bike Fit"
      description="Track bike setup measurements and keep fit history organized."
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
          <section id="bike-fit" className="mb-6">
            <section id="fit-measurement-form" className="scroll-mt-40">
              <FitMeasurementForm
                bikeId={bike.id}
                disabled={!data.dbConnected}
                collapsible
                defaultOpen={shouldOpenAddMeasurementForm}
              />
            </section>
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

          <section
            id="fit-history"
            className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm scroll-mt-40"
          >
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
