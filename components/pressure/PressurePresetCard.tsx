type PressurePresetCardProps = {
  name: string;
  frontPsi: number;
  rearPsi: number;
  surface: string;
  preference: string;
};

export function PressurePresetCard({
  name,
  frontPsi,
  rearPsi,
  surface,
  preference,
}: PressurePresetCardProps) {
  return (
    <article className="rounded-3xl border border-orange-200 bg-white p-4 shadow-warm">
      <h3 className="font-display text-lg font-semibold text-orange-950">{name}</h3>
      <p className="mt-1 text-sm text-orange-900/70">
        {surface.replaceAll("_", " ")} · {preference}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-orange-50 p-3 text-center">
          <p className="text-xs text-orange-700">Front</p>
          <p className="font-display text-xl font-bold text-orange-950">{frontPsi} PSI</p>
        </div>
        <div className="rounded-2xl bg-orange-50 p-3 text-center">
          <p className="text-xs text-orange-700">Rear</p>
          <p className="font-display text-xl font-bold text-orange-950">{rearPsi} PSI</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2 text-xs font-semibold">
        <button type="button" className="rounded-full border border-orange-300 px-3 py-1 text-orange-800 hover:bg-orange-100">
          Edit
        </button>
        <button type="button" className="rounded-full border border-red-300 px-3 py-1 text-red-700 hover:bg-red-50">
          Delete
        </button>
      </div>
    </article>
  );
}
