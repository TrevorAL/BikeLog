"use client";

import { useState } from "react";

export function FitMeasurementForm() {
  const [saved, setSaved] = useState(false);

  return (
    <form
      className="rounded-3xl border border-orange-200 bg-white p-5 shadow-warm"
      onSubmit={(event) => {
        event.preventDefault();
        setSaved(true);
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-display text-xl font-semibold text-orange-950">Add fit measurement</h3>
        {saved ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            Form captured
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-orange-900">
          Date
          <input type="date" className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2" required />
        </label>
        <label className="text-sm text-orange-900">
          Saddle height (mm)
          <input type="number" className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2" />
        </label>
        <label className="text-sm text-orange-900">
          Saddle setback (mm)
          <input type="number" className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2" />
        </label>
        <label className="text-sm text-orange-900">
          Stem length (mm)
          <input type="number" defaultValue={110} className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2" />
        </label>
        <label className="text-sm text-orange-900">
          Handlebar width (mm)
          <input type="number" defaultValue={420} className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2" />
        </label>
        <label className="text-sm text-orange-900">
          Crank length (mm)
          <input
            type="number"
            step="0.5"
            defaultValue={172.5}
            className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
          />
        </label>
      </div>

      <label className="mt-3 block text-sm text-orange-900">
        Notes
        <textarea className="mt-1 h-20 w-full rounded-xl border border-orange-200 px-3 py-2" />
      </label>

      <button
        type="submit"
        className="mt-4 rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700"
      >
        Save measurement (static)
      </button>
    </form>
  );
}
