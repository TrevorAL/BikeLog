"use client";

import { useState } from "react";

const rideTypes = [
  "OUTDOOR",
  "INDOOR",
  "RACE",
  "GROUP_RIDE",
  "TRAINING",
  "RECOVERY",
  "LONG_RIDE",
] as const;

const roadConditions = ["Smooth", "Normal", "Rough", "Very Rough", "Wet", "Mixed"] as const;

export function RideForm() {
  const [saved, setSaved] = useState(false);

  return (
    <form
      className="rounded-3xl border border-orange-200 bg-white p-5 shadow-warm"
      onSubmit={(event) => {
        event.preventDefault();
        setSaved(true);
      }}
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-semibold text-orange-950">Log a ride</h3>
          <p className="text-sm text-orange-900/70">
            This MVP form is static for now. Create/update actions are the next step.
          </p>
        </div>
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
          Distance (mi)
          <input
            type="number"
            min="0"
            step="0.1"
            className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
            required
          />
        </label>
        <label className="text-sm text-orange-900">
          Duration (minutes)
          <input
            type="number"
            min="0"
            className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
          />
        </label>
        <label className="text-sm text-orange-900">
          Ride type
          <select className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2" defaultValue="OUTDOOR">
            {rideTypes.map((rideType) => (
              <option key={rideType} value={rideType}>
                {rideType.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-orange-900">
          Road condition
          <select className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2" defaultValue="Normal">
            {roadConditions.map((condition) => (
              <option key={condition} value={condition}>
                {condition}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 pt-6 text-sm text-orange-900">
          <input type="checkbox" className="h-4 w-4 rounded border-orange-300 text-orange-600" />
          Ride was wet
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
        Save ride (static)
      </button>
    </form>
  );
}
