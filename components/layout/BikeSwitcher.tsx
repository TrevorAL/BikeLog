"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BikeSwitcherBike = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  year: number | null;
};

type BikeSwitcherProps = {
  bikes: BikeSwitcherBike[];
  selectedBikeId?: string;
};

function bikeLabel(bike: BikeSwitcherBike) {
  const primary = [bike.year, bike.brand, bike.model].filter(Boolean).join(" ").trim();
  return primary.length > 0 ? primary : bike.name;
}

export function BikeSwitcher({ bikes, selectedBikeId }: BikeSwitcherProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  if (bikes.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="bike-switcher" className="text-xs font-semibold text-orange-900/80">
        Bike
      </label>
      <select
        id="bike-switcher"
        value={selectedBikeId ?? bikes[0].id}
        onChange={async (event) => {
          const bikeId = event.target.value;
          setIsSaving(true);
          setError(undefined);

          try {
            const response = await fetch("/api/bikes/select", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                bikeId,
              }),
            });

            const payload = (await response.json()) as { error?: string };
            if (!response.ok) {
              throw new Error(payload.error ?? "Could not switch bikes.");
            }

            router.refresh();
          } catch (switchError) {
            const message =
              switchError instanceof Error ? switchError.message : "Could not switch bikes.";
            setError(message);
          } finally {
            setIsSaving(false);
          }
        }}
        disabled={isSaving || bikes.length <= 1}
        className="rounded-xl border border-orange-300 bg-white px-2 py-1 text-xs font-medium text-orange-950 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {bikes.map((bike) => (
          <option key={bike.id} value={bike.id}>
            {bikeLabel(bike)}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
