import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintHistoryButton } from "@/components/bike/PrintHistoryButton";
import { LogoMark } from "@/components/ui/illustrations/LogoMark";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";

function formatEnumLabel(value: string) {
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function SharePage({ params }: PageProps) {
  const { token } = await params;

  const bike = await prisma.bike.findFirst({
    where: { shareToken: token, isShared: true },
    select: {
      name: true,
      brand: true,
      model: true,
      year: true,
      frameMaterial: true,
      frameSize: true,
      drivetrain: true,
      brakeType: true,
      wheelset: true,
      tireSetup: true,
      notes: true,
      purchasePrice: true,
      imageUrl: true,
      createdAt: true,
      components: {
        orderBy: { installDate: "desc" },
        select: {
          type: true,
          name: true,
          brand: true,
          model: true,
          installDate: true,
          currentMileage: true,
          initialMileage: true,
          price: true,
          status: true,
          isActive: true,
          notes: true,
        },
      },
      maintenanceEvents: {
        orderBy: { date: "desc" },
        select: {
          type: true,
          date: true,
          mileageAtService: true,
          notes: true,
          component: { select: { name: true } },
        },
      },
      rides: { select: { distanceMiles: true } },
    },
  });

  if (!bike) notFound();

  const totalMiles = Math.round(bike.rides.reduce((sum, r) => sum + r.distanceMiles, 0));
  const rideCount = bike.rides.length;
  const sinceYear = bike.createdAt.getFullYear();

  const activeComponents = bike.components.filter((c) => c.isActive);
  const retiredComponents = bike.components.filter((c) => !c.isActive);

  const componentsPriceTotal = activeComponents.reduce(
    (sum, c) => sum + (c.price ?? 0),
    0,
  );
  const estimatedValue = (bike.purchasePrice ?? 0) + componentsPriceTotal;
  const hasAnyPricing =
    bike.purchasePrice != null || activeComponents.some((c) => c.price != null);

  const specs: { label: string; value: string }[] = [
    bike.frameMaterial ? { label: "Frame material", value: bike.frameMaterial } : null,
    bike.frameSize ? { label: "Frame size", value: bike.frameSize } : null,
    bike.drivetrain ? { label: "Drivetrain", value: bike.drivetrain } : null,
    bike.brakeType ? { label: "Brakes", value: bike.brakeType } : null,
    bike.wheelset ? { label: "Wheelset", value: bike.wheelset } : null,
    bike.tireSetup ? { label: "Tire setup", value: bike.tireSetup } : null,
  ].filter((s): s is { label: string; value: string } => s !== null);

  const headline = [bike.year, bike.brand, bike.model].filter(Boolean).join(" ");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark className="h-7 w-7 text-brand-500" />
            <span className="font-display text-sm font-semibold tracking-tight text-slate-900">
              BikeLog
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <PrintHistoryButton />
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              Service History
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        {/* Bike headline */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {bike.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bike.imageUrl}
              alt={`${bike.name} photo`}
              className="max-h-80 w-full object-cover"
            />
          ) : null}
          <div className="p-6">
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            {headline || bike.name}
          </h1>
          {headline && headline !== bike.name && (
            <p className="mt-0.5 text-base text-slate-600">{bike.name}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-brand-600">{totalMiles.toLocaleString()}</p>
              <p className="text-xs text-slate-500">total miles</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-800">{rideCount.toLocaleString()}</p>
              <p className="text-xs text-slate-500">rides logged</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-800">{sinceYear}</p>
              <p className="text-xs text-slate-500">on the road since</p>
            </div>
          </div>

          {hasAnyPricing && (
            <div className="mt-5 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-brand-700">
                  Estimated value
                </p>
                <p className="font-display mt-0.5 text-3xl font-bold text-slate-900">
                  {formatCurrency(estimatedValue)}
                </p>
              </div>
              <p className="text-xs text-slate-500">
                Bike {formatCurrency(bike.purchasePrice ?? 0)} + components{" "}
                {formatCurrency(componentsPriceTotal)}
                <br />
                Based on owner-entered prices. Actual resale value may vary.
              </p>
            </div>
          )}
          </div>
        </div>

        {/* Specs */}
        {specs.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Bike specs
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {specs.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                >
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">{s.value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Current components */}
        {activeComponents.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Current components
            </h2>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500">Component</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500">Installed</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">
                      Miles on it
                    </th>
                    {hasAnyPricing && (
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">
                        Price
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeComponents.map((c, i) => {
                    const milesOn = Math.round(c.currentMileage - c.initialMileage);
                    const label = [c.brand, c.model].filter(Boolean).join(" ") || c.name;
                    return (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{label}</p>
                          <p className="text-xs text-slate-500">{formatEnumLabel(c.type)}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {c.installDate ? formatDate(c.installDate) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">
                          {milesOn > 0 ? milesOn.toLocaleString() : "—"}
                        </td>
                        {hasAnyPricing && (
                          <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-900">
                            {formatCurrency(c.price, { showCents: true }) ?? "—"}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Maintenance log */}
        {bike.maintenanceEvents.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Maintenance log
            </h2>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <ul className="divide-y divide-slate-100">
                {bike.maintenanceEvents.map((e, i) => (
                  <li key={i} className="flex items-start gap-4 px-4 py-3">
                    <div className="min-w-[90px] text-xs text-slate-500">{formatDate(e.date)}</div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{formatEnumLabel(e.type)}</p>
                      {e.component && (
                        <p className="text-xs text-slate-500">{e.component.name}</p>
                      )}
                      {e.notes && <p className="mt-0.5 text-xs text-slate-500">{e.notes}</p>}
                    </div>
                    {e.mileageAtService != null && (
                      <div className="text-right text-xs text-slate-500">
                        {Math.round(e.mileageAtService).toLocaleString()} mi
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Retired components */}
        {retiredComponents.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Previous components
            </h2>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <ul className="divide-y divide-slate-100">
                {retiredComponents.map((c, i) => {
                  const label = [c.brand, c.model].filter(Boolean).join(" ") || c.name;
                  return (
                    <li key={i} className="flex items-center gap-4 px-4 py-3">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{label}</p>
                        <p className="text-xs text-slate-500">{formatEnumLabel(c.type)}</p>
                      </div>
                      <StatusBadge status={c.status} />
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        )}

        {/* Notes */}
        {bike.notes && (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Notes
            </h2>
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <p className="whitespace-pre-wrap text-sm text-slate-700">{bike.notes}</p>
            </div>
          </section>
        )}
      </main>

      {/* Footer CTA */}
      <footer className="mt-8 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 py-8 text-center">
          <LogoMark className="h-8 w-8 text-brand-400" />
          <p className="text-sm text-slate-600">
            Track maintenance, components, and ride history for your own bike.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            Start tracking on BikeLog →
          </Link>
        </div>
      </footer>
    </div>
  );
}
