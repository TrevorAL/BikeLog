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
    <article className="rounded-3xl border border-orange-200 bg-white p-4 shadow-warm">
      <p className="text-xs uppercase tracking-wide text-orange-700">{date.toLocaleDateString()}</p>
      <h3 className="font-display mt-1 text-lg font-semibold text-orange-950">{type.replaceAll("_", " ")}</h3>
      <p className="text-sm text-orange-900/70">{componentName ?? "General bike service"}</p>
      <div className="mt-3 space-y-1 text-sm text-orange-900/80">
        {typeof mileageAtService === "number" ? <p>Mileage: {mileageAtService} mi</p> : null}
        {notes ? <p>Notes: {notes}</p> : null}
      </div>
    </article>
  );
}
