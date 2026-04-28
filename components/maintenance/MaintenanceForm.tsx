"use client";

import { useState } from "react";

const maintenanceTypes = [
  "LUBED_CHAIN",
  "CLEANED_CHAIN",
  "CHECKED_CHAIN_WEAR",
  "REPLACED_CHAIN",
  "CHECKED_TIRE_PRESSURE",
  "INSPECTED_TIRE",
  "REPLACED_TIRE",
  "INSPECTED_BRAKE_PADS",
  "REPLACED_BRAKE_PADS",
  "CHARGED_DI2",
  "CHECKED_BOLTS",
  "FIT_ADJUSTMENT",
  "REPLACED_COMPONENT",
  "OTHER",
] as const;

export function MaintenanceForm() {
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
        <h3 className="font-display text-xl font-semibold text-orange-950">Log maintenance</h3>
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
          Event type
          <select className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2" defaultValue="LUBED_CHAIN">
            {maintenanceTypes.map((maintenanceType) => (
              <option key={maintenanceType} value={maintenanceType}>
                {maintenanceType.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-orange-900">
          Mileage at service
          <input type="number" min="0" className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2" />
        </label>
        <label className="text-sm text-orange-900">
          Component
          <input
            type="text"
            placeholder="Optional"
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
        Save event (static)
      </button>
    </form>
  );
}
