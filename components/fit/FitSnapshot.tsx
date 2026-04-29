type FitSnapshotProps = {
  saddleHeightMm?: number;
  saddleSetbackMm?: number;
  stemLengthMm?: number;
  handlebarWidthMm?: number;
  crankLengthMm?: number;
  spacerStackMm?: number;
  reachToHoodsMm?: number;
  notes?: string;
};

export function FitSnapshot({
  saddleHeightMm,
  saddleSetbackMm,
  stemLengthMm,
  handlebarWidthMm,
  crankLengthMm,
  spacerStackMm,
  reachToHoodsMm,
  notes,
}: FitSnapshotProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-display text-xl font-semibold text-slate-900">Bike Fit Snapshot</h3>
      <p className="mt-1 text-sm text-slate-600">Save the measurements that keep your bike feeling dialed.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-slate-50 p-3 text-sm">Saddle height: {saddleHeightMm ?? "-"} mm</div>
        <div className="rounded-lg bg-slate-50 p-3 text-sm">Saddle setback: {saddleSetbackMm ?? "-"} mm</div>
        <div className="rounded-lg bg-slate-50 p-3 text-sm">Stem length: {stemLengthMm ?? "-"} mm</div>
        <div className="rounded-lg bg-slate-50 p-3 text-sm">Handlebar width: {handlebarWidthMm ?? "-"} mm</div>
        <div className="rounded-lg bg-slate-50 p-3 text-sm">Crank length: {crankLengthMm ?? "-"} mm</div>
        <div className="rounded-lg bg-slate-50 p-3 text-sm">Spacer stack: {spacerStackMm ?? "-"} mm</div>
        <div className="rounded-lg bg-slate-50 p-3 text-sm sm:col-span-2">Reach to hoods: {reachToHoodsMm ?? "-"} mm</div>
      </div>
      {notes ? <p className="mt-4 text-sm text-slate-600">Notes: {notes}</p> : null}
    </section>
  );
}
