"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { PressurePresetCard } from "@/components/pressure/PressurePresetCard";
import { PRESSURE_PREFERENCES, PRESSURE_SURFACES } from "@/lib/pressure-options";

type PressurePresetItem = {
  id: string;
  name: string;
  riderWeightLbs: number;
  bikeWeightLbs: number;
  gearWeightLbs: number | null;
  frontTireWidthMm: number;
  rearTireWidthMm: number;
  tubeless: boolean;
  surface: string;
  preference: string;
  frontPsi: number;
  rearPsi: number;
  notes: string | null;
};

type PressurePresetManagerProps = {
  presets: PressurePresetItem[];
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

function EditablePressurePresetCard({
  preset,
  disabled,
  onSuccess,
}: {
  preset: PressurePresetItem;
  disabled: boolean;
  onSuccess: (message: string) => void;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<FormStatus>({ type: "idle" });

  if (isEditing) {
    return (
      <form
        className="rounded-3xl border border-orange-200 bg-white p-4 shadow-warm"
        onSubmit={async (event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);

          setIsSubmitting(true);
          setStatus({ type: "idle" });

          try {
            const response = await fetch(`/api/pressure-presets/${preset.id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: formData.get("name"),
                riderWeightLbs: Number(formData.get("riderWeightLbs")),
                bikeWeightLbs: Number(formData.get("bikeWeightLbs")),
                gearWeightLbs:
                  formData.get("gearWeightLbs") === ""
                    ? undefined
                    : Number(formData.get("gearWeightLbs")),
                frontTireWidthMm: Number(formData.get("frontTireWidthMm")),
                rearTireWidthMm: Number(formData.get("rearTireWidthMm")),
                tubeless: formData.get("tubeless") === "on",
                surface: formData.get("surface"),
                preference: formData.get("preference"),
                frontPsi: Number(formData.get("frontPsi")),
                rearPsi: Number(formData.get("rearPsi")),
                notes: parseOptionalText(formData.get("notes")),
              }),
            });

            const payload = (await response.json()) as { error?: string };

            if (!response.ok) {
              throw new Error(payload.error ?? "Could not update preset.");
            }

            setIsEditing(false);
            onSuccess("Preset updated.");
            router.refresh();
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Could not update preset right now.";
            setStatus({ type: "error", message });
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-lg font-semibold text-orange-950">Edit preset</h3>
          <button
            type="button"
            onClick={() => {
              setIsEditing(false);
              setStatus({ type: "idle" });
            }}
            className="rounded-full border border-orange-300 px-3 py-1 text-xs font-semibold text-orange-900 hover:bg-orange-100"
          >
            Cancel
          </button>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-orange-900">
            Preset name
            <input
              name="name"
              type="text"
              required
              defaultValue={preset.name}
              className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
            />
          </label>
          <label className="text-sm text-orange-900">
            Rider weight (lbs)
            <input
              name="riderWeightLbs"
              type="number"
              min="0"
              step="0.1"
              defaultValue={preset.riderWeightLbs}
              className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
            />
          </label>
          <label className="text-sm text-orange-900">
            Bike weight (lbs)
            <input
              name="bikeWeightLbs"
              type="number"
              min="0"
              step="0.1"
              defaultValue={preset.bikeWeightLbs}
              className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
            />
          </label>
          <label className="text-sm text-orange-900">
            Gear weight (lbs)
            <input
              name="gearWeightLbs"
              type="number"
              min="0"
              step="0.1"
              defaultValue={preset.gearWeightLbs ?? ""}
              className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
            />
          </label>
          <label className="text-sm text-orange-900">
            Front tire width (mm)
            <input
              name="frontTireWidthMm"
              type="number"
              min="0"
              defaultValue={preset.frontTireWidthMm}
              className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
            />
          </label>
          <label className="text-sm text-orange-900">
            Rear tire width (mm)
            <input
              name="rearTireWidthMm"
              type="number"
              min="0"
              defaultValue={preset.rearTireWidthMm}
              className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
            />
          </label>
          <label className="text-sm text-orange-900">
            Surface
            <select
              name="surface"
              defaultValue={preset.surface}
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
              name="preference"
              defaultValue={preset.preference}
              className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
            >
              {PRESSURE_PREFERENCES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-orange-900">
            Front PSI
            <input
              name="frontPsi"
              type="number"
              min="0"
              step="0.1"
              defaultValue={preset.frontPsi}
              className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
            />
          </label>
          <label className="text-sm text-orange-900">
            Rear PSI
            <input
              name="rearPsi"
              type="number"
              min="0"
              step="0.1"
              defaultValue={preset.rearPsi}
              className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 pt-6 text-sm text-orange-900">
            <input
              name="tubeless"
              type="checkbox"
              defaultChecked={preset.tubeless}
              className="h-4 w-4 rounded border-orange-300 text-orange-600"
            />
            Tubeless setup
          </label>
        </div>

        <label className="mt-3 block text-sm text-orange-900">
          Notes
          <textarea
            name="notes"
            defaultValue={preset.notes ?? ""}
            className="mt-1 h-20 w-full rounded-xl border border-orange-200 px-3 py-2"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting || disabled}
          className="mt-4 rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : "Save changes"}
        </button>

        {status.type === "error" && status.message ? (
          <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-800">{status.message}</p>
        ) : null}
      </form>
    );
  }

  return (
    <div>
      <PressurePresetCard
        name={preset.name}
        frontPsi={preset.frontPsi}
        rearPsi={preset.rearPsi}
        surface={preset.surface}
        preference={preset.preference}
        notes={preset.notes}
        actions={
          <div className="mt-4 flex gap-2 text-xs font-semibold">
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setIsEditing(true);
                setStatus({ type: "idle" });
              }}
              className="rounded-full border border-orange-300 px-3 py-1 text-orange-800 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Edit
            </button>
            <button
              type="button"
              disabled={disabled || isSubmitting}
              onClick={async () => {
                const confirmed = window.confirm("Delete this pressure preset?");
                if (!confirmed) {
                  return;
                }

                setIsSubmitting(true);
                setStatus({ type: "idle" });

                try {
                  const response = await fetch(`/api/pressure-presets/${preset.id}`, {
                    method: "DELETE",
                  });

                  const payload = (await response.json()) as { error?: string };

                  if (!response.ok) {
                    throw new Error(payload.error ?? "Could not delete preset.");
                  }

                  onSuccess("Preset deleted.");
                  router.refresh();
                } catch (error) {
                  const message =
                    error instanceof Error
                      ? error.message
                      : "Could not delete preset right now.";
                  setStatus({ type: "error", message });
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="rounded-full border border-red-300 px-3 py-1 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Working..." : "Delete"}
            </button>
          </div>
        }
      />

      {status.type === "error" && status.message ? (
        <p className="mt-2 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-800">{status.message}</p>
      ) : null}
    </div>
  );
}

export function PressurePresetManager({ presets, disabled = false }: PressurePresetManagerProps) {
  const [status, setStatus] = useState<FormStatus>({ type: "idle" });

  if (presets.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-orange-300 bg-orange-50 px-4 py-4 text-sm text-orange-900/75">
        No saved pressure presets yet. Use the calculator above to save your first setup.
      </p>
    );
  }

  return (
    <div>
      {status.type === "success" && status.message ? (
        <p className="mb-3 rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {status.message}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {presets.map((preset) => (
          <EditablePressurePresetCard
            key={preset.id}
            preset={preset}
            disabled={disabled}
            onSuccess={(message) => setStatus({ type: "success", message })}
          />
        ))}
      </div>
    </div>
  );
}
