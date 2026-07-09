"use client";

import { useState } from "react";

import { ShareHistoryPanel } from "@/components/bike/ShareHistoryPanel";

type ShareableBike = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  year: number | null;
};

type Props = {
  bikes: ShareableBike[];
  defaultBikeId: string;
};

function bikeLabel(bike: ShareableBike) {
  const detailed = [bike.year, bike.brand, bike.model].filter(Boolean).join(" ").trim();
  return detailed.length > 0 ? `${detailed} — ${bike.name}` : bike.name;
}

export function ShareHistorySection({ bikes, defaultBikeId }: Props) {
  const [selectedId, setSelectedId] = useState(defaultBikeId);
  const activeId = bikes.some((bike) => bike.id === selectedId)
    ? selectedId
    : (bikes[0]?.id ?? defaultBikeId);

  return (
    <div>
      {bikes.length > 1 ? (
        <label className="mt-3 block text-sm text-slate-700">
          Bike to share
          <select
            value={activeId}
            onChange={(event) => setSelectedId(event.target.value)}
            className="mt-1 w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900"
          >
            {bikes.map((bike) => (
              <option key={bike.id} value={bike.id}>
                {bikeLabel(bike)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {/* Remount the panel per bike so its lazy share-state fetch re-runs. */}
      <ShareHistoryPanel key={activeId} bikeId={activeId} />
    </div>
  );
}
