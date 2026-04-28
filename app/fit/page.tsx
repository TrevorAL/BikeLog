import { FitHistoryManager } from "@/components/fit/FitHistoryManager";
import { FitMeasurementForm } from "@/components/fit/FitMeasurementForm";
import { FitSnapshot } from "@/components/fit/FitSnapshot";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireServerUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getFitPageData(userId: string) {
  try {
    const bike = await prisma.bike.findFirst({
      where: {
        userId,
      },
      orderBy: { createdAt: "asc" },
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

  return (
    <AppShell title="Bike Fit" description="Store your setup measurements and keep fit history organized.">
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
        <>
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

          <section className="mt-6 rounded-3xl border border-orange-200 bg-white p-5 shadow-warm">
            <h2 className="font-display text-xl font-semibold text-orange-950">Fit history</h2>
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
