import { FitRangeCoach } from "@/components/fit/FitRangeCoach";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireServerUser } from "@/lib/auth";
import { getFitPageData } from "@/lib/fit-page-data";

export const dynamic = "force-dynamic";

export default async function RiderFitPage() {
  const user = await requireServerUser();
  const data = await getFitPageData(user.id);
  const bike = data.bike;

  const currentMeasurement =
    bike?.fitMeasurements.find((measurement) => measurement.isCurrent) ??
    bike?.fitMeasurements[0];

  return (
    <AppShell
      title="Rider Fit"
      description="Track rider dimensions and compare your current setup against target ranges."
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
        <section id="rider-fit" className="scroll-mt-40">
          <FitRangeCoach
            current={{
              saddleHeightMm: currentMeasurement?.saddleHeightMm ?? undefined,
              saddleSetbackMm: currentMeasurement?.saddleSetbackMm ?? undefined,
              stemLengthMm: currentMeasurement?.stemLengthMm ?? undefined,
              handlebarWidthMm: currentMeasurement?.handlebarWidthMm ?? undefined,
              reachToHoodsMm: currentMeasurement?.reachToHoodsMm ?? undefined,
              crankLengthMm: currentMeasurement?.crankLengthMm ?? undefined,
              spacerStackMm: currentMeasurement?.spacerStackMm ?? undefined,
            }}
          />
        </section>
      ) : (
        <EmptyState
          title="No bike data yet"
          description="Seed the default bike first, then rider-fit guidance can be calculated."
        />
      )}
    </AppShell>
  );
}
