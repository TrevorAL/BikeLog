const RING_RADIUS = 30;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const RING_PROGRESS = 0.92;

export function ProductPreviewCard() {
  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-5 shadow-elevated sm:p-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>
        <p className="text-xs font-semibold text-slate-400">Dashboard · Trail Bike</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-[11px] font-medium text-slate-500">Readiness</p>
          <p className="font-display mt-1 text-2xl font-bold text-slate-900">94%</p>
          <p className="mt-0.5 text-[11px] font-medium text-emerald-600">Ready to ride</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-[11px] font-medium text-slate-500">Next service</p>
          <p className="font-display mt-1 text-2xl font-bold text-slate-900">180 mi</p>
          <p className="mt-0.5 text-[11px] font-medium text-amber-600">Chain due soon</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[auto,1fr] items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
        <svg viewBox="0 0 72 72" className="h-16 w-16 -rotate-90">
          <circle cx="36" cy="36" r={RING_RADIUS} fill="none" stroke="#e2e8f0" strokeWidth="7" />
          <circle
            cx="36"
            cy="36"
            r={RING_RADIUS}
            fill="none"
            stroke="#f97316"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - RING_PROGRESS)}
          />
          <text
            x="36"
            y="36"
            transform="rotate(90 36 36)"
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-slate-900 text-[15px] font-bold"
          >
            92%
          </text>
        </svg>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-slate-500">Tire pressure</p>
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-8 text-[11px] text-slate-500">Front</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-brand-500 to-amber-400" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-8 text-[11px] text-slate-500">Rear</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full w-[88%] rounded-full bg-gradient-to-r from-brand-500 to-amber-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
