"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { PressurePreference, PressureSurface } from "@/lib/constants";
import { calculatePressure } from "@/lib/pressure";
import { PRESSURE_PREFERENCES, PRESSURE_SURFACES } from "@/lib/pressure-options";

type PressureCalculatorProps = {
  bikeId?: string;
  disabled?: boolean;
};

type FormStatus = {
  type: "idle" | "success" | "error";
  message?: string;
};

function parseOptionalText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function PressureCalculator({ bikeId, disabled = false }: PressureCalculatorProps) {
  const router = useRouter();
  const [riderWeightLbs, setRiderWeightLbs] = useState(165);
  const [bikeWeightLbs, setBikeWeightLbs] = useState(18);
  const [gearWeightLbs, setGearWeightLbs] = useState(4);
  const [frontTireWidthMm, setFrontTireWidthMm] = useState(25);
  const [rearTireWidthMm, setRearTireWidthMm] = useState(25);
  const [tubeless, setTubeless] = useState(false);
  const [surface, setSurface] = useState<PressureSurface>("normal");
  const [preference, setPreference] = useState<PressurePreference>("balanced");
  const [presetName, setPresetName] = useState("Normal Road");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<FormStatus>({ type: "idle" });

  const result = useMemo(
    () =>
      calculatePressure({
        riderWeightLbs,
        bikeWeightLbs,
        gearWeightLbs,
        frontTireWidthMm,
        rearTireWidthMm,
        tubeless,
        surface,
        preference,
      }),
    [
      riderWeightLbs,
      bikeWeightLbs,
      gearWeightLbs,
      frontTireWidthMm,
      rearTireWidthMm,
      tubeless,
      surface,
      preference,
    ],
  );

  return (
    <form
      className="rounded-3xl border border-orange-200 bg-white p-5 shadow-warm"
      onSubmit={async (event) => {
        event.preventDefault();

        if (disabled) {
          setStatus({ type: "error", message: "Seed a bike first to save pressure presets." });
          return;
        }

        setIsSubmitting(true);
        setStatus({ type: "idle" });

        try {
          const response = await fetch("/api/pressure-presets", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              bikeId,
              name: presetName,
              riderWeightLbs,
              bikeWeightLbs,
              gearWeightLbs,
              frontTireWidthMm,
              rearTireWidthMm,
              tubeless,
              surface,
              preference,
              frontPsi: result.frontPsi,
              rearPsi: result.rearPsi,
              notes: parseOptionalText(notes),
            }),
          });

          const payload = (await response.json()) as { error?: string };

          if (!response.ok) {
            throw new Error(payload.error ?? "Could not save preset.");
          }

          setStatus({ type: "success", message: "Pressure preset saved." });
          router.refresh();
        } catch (error) {
          const message = error instanceof Error ? error.message : "Could not save preset right now.";
          setStatus({ type: "error", message });
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <h3 className="font-display text-xl font-semibold text-orange-950">Tire pressure calculator</h3>
      <p className="mt-1 text-sm text-orange-900/70">
        Estimate only. Tune pressure by comfort, grip, and local road conditions.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-orange-900">
          Rider weight (lbs)
          <input
            type="number"
            value={riderWeightLbs}
            min={90}
            onChange={(event) => setRiderWeightLbs(Number(event.target.value))}
            className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
          />
        </label>
        <label className="text-sm text-orange-900">
          Bike weight (lbs)
          <input
            type="number"
            value={bikeWeightLbs}
            min={10}
            onChange={(event) => setBikeWeightLbs(Number(event.target.value))}
            className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
          />
        </label>
        <label className="text-sm text-orange-900">
          Gear weight (lbs)
          <input
            type="number"
            value={gearWeightLbs}
            min={0}
            onChange={(event) => setGearWeightLbs(Number(event.target.value))}
            className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
          />
        </label>
        <label className="text-sm text-orange-900">
          Front tire width (mm)
          <input
            type="number"
            value={frontTireWidthMm}
            min={20}
            onChange={(event) => setFrontTireWidthMm(Number(event.target.value))}
            className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
          />
        </label>
        <label className="text-sm text-orange-900">
          Rear tire width (mm)
          <input
            type="number"
            value={rearTireWidthMm}
            min={20}
            onChange={(event) => setRearTireWidthMm(Number(event.target.value))}
            className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
          />
        </label>
        <label className="text-sm text-orange-900">
          Surface
          <select
            value={surface}
            onChange={(event) => setSurface(event.target.value as PressureSurface)}
            className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
          >
            {PRESSURE_SURFACES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-orange-900">
          Ride priority
          <select
            value={preference}
            onChange={(event) => setPreference(event.target.value as PressurePreference)}
            className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
          >
            {PRESSURE_PREFERENCES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 pt-6 text-sm text-orange-900">
          <input
            type="checkbox"
            checked={tubeless}
            onChange={(event) => setTubeless(event.target.checked)}
            className="h-4 w-4 rounded border-orange-300 text-orange-600"
          />
          Tubeless setup
        </label>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-orange-50 p-4 text-center">
          <p className="text-xs uppercase tracking-wide text-orange-700">Front</p>
          <p className="font-display text-3xl font-bold text-orange-950">{result.frontPsi} PSI</p>
        </div>
        <div className="rounded-2xl bg-orange-50 p-4 text-center">
          <p className="text-xs uppercase tracking-wide text-orange-700">Rear</p>
          <p className="font-display text-3xl font-bold text-orange-950">{result.rearPsi} PSI</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-orange-900">
          Preset name
          <input
            type="text"
            value={presetName}
            onChange={(event) => setPresetName(event.target.value)}
            className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
            required
          />
        </label>
        <label className="text-sm text-orange-900">
          Notes
          <input
            type="text"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
            placeholder="Optional"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || disabled}
        className="mt-4 rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Saving..." : "Save preset"}
      </button>

      {status.type === "success" && status.message ? (
        <p className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {status.message}
        </p>
      ) : null}

      {status.type === "error" && status.message ? (
        <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-800">{status.message}</p>
      ) : null}
    </form>
  );
}
