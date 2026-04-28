import { AppShell } from "@/components/layout/AppShell";
import { FitMeasurementForm } from "@/components/fit/FitMeasurementForm";
import { FitSnapshot } from "@/components/fit/FitSnapshot";
import { mockFitMeasurements } from "@/lib/mock-data";

export default function FitPage() {
  const currentMeasurement =
    mockFitMeasurements.find((measurement) => measurement.isCurrent) ?? mockFitMeasurements[0];

  return (
    <AppShell title="Bike Fit" description="Store your setup measurements and keep fit history organized.">
      <FitSnapshot
        saddleHeightMm={currentMeasurement.saddleHeightMm}
        saddleSetbackMm={currentMeasurement.saddleSetbackMm}
        stemLengthMm={currentMeasurement.stemLengthMm}
        handlebarWidthMm={currentMeasurement.handlebarWidthMm}
        crankLengthMm={currentMeasurement.crankLengthMm}
        spacerStackMm={currentMeasurement.spacerStackMm}
        reachToHoodsMm={currentMeasurement.reachToHoodsMm}
        notes={currentMeasurement.notes}
      />

      <section className="mt-6">
        <FitMeasurementForm />
      </section>

      <section className="mt-6 rounded-3xl border border-orange-200 bg-white p-5 shadow-warm">
        <h2 className="font-display text-xl font-semibold text-orange-950">Fit history</h2>
        <div className="mt-3 space-y-2">
          {mockFitMeasurements.map((measurement) => (
            <article
              key={measurement.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-orange-100 bg-orange-50/70 px-3 py-2 text-sm"
            >
              <p className="font-semibold text-orange-950">{measurement.date.toLocaleDateString()}</p>
              <p className="text-orange-900/75">
                Saddle {measurement.saddleHeightMm} mm · Reach {measurement.reachToHoodsMm} mm
              </p>
              {measurement.isCurrent ? (
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                  Current
                </span>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
