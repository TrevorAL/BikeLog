type MaintenanceEventCardProps = {
  date: Date;
  type: string;
  mileageAtService?: number;
  notes?: string;
  componentName?: string;
};

export function MaintenanceEventCard({
  date,
  type,
  mileageAtService,
  notes,
  componentName,
}: MaintenanceEventCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-600">{date.toLocaleDateString()}</p>
      <h3 className="font-display mt-1 text-base font-semibold tracking-tight text-slate-900">
        {type.replaceAll("_", " ")}
      </h3>
      <p className="text-sm text-slate-600">{componentName ?? "General bike service"}</p>
      <div className="mt-2 space-y-1 text-sm text-slate-600">
        {typeof mileageAtService === "number" ? <p>Mileage: {mileageAtService} mi</p> : null}
        {notes ? <p>Notes: {notes}</p> : null}
      </div>
    </article>
  );
}
