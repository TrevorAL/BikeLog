"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FitMeasurementFormProps = {
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

function parseOptionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }

  return Number(value);
}

export function FitMeasurementForm({ bikeId, disabled = false }: FitMeasurementFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<FormStatus>({ type: "idle" });

  return (
    <form
      className="rounded-3xl border border-orange-200 bg-white p-5 shadow-warm"
      onSubmit={async (event) => {
        event.preventDefault();

        if (disabled) {
          setStatus({
            type: "error",
            message: "Seed a bike first to save fit measurements.",
          });
          return;
        }

        const form = event.currentTarget;
        const formData = new FormData(form);

        setIsSubmitting(true);
        setStatus({ type: "idle" });

        try {
          const response = await fetch("/api/fit-measurements", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              bikeId,
              date: formData.get("date"),
              saddleHeightMm: parseOptionalNumber(formData.get("saddleHeightMm")),
              saddleSetbackMm: parseOptionalNumber(formData.get("saddleSetbackMm")),
              saddleTiltDeg: parseOptionalNumber(formData.get("saddleTiltDeg")),
              stemLengthMm: parseOptionalNumber(formData.get("stemLengthMm")),
              handlebarWidthMm: parseOptionalNumber(formData.get("handlebarWidthMm")),
              crankLengthMm: parseOptionalNumber(formData.get("crankLengthMm")),
              spacerStackMm: parseOptionalNumber(formData.get("spacerStackMm")),
              reachToHoodsMm: parseOptionalNumber(formData.get("reachToHoodsMm")),
              cleatNotes: parseOptionalText(formData.get("cleatNotes")),
              notes: parseOptionalText(formData.get("notes")),
              isCurrent: formData.get("isCurrent") === "on",
            }),
          });

          const payload = (await response.json()) as { error?: string };

          if (!response.ok) {
            throw new Error(payload.error ?? "Could not save fit measurement.");
          }

          form.reset();
          setStatus({ type: "success", message: "Fit measurement saved." });
          router.refresh();
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Could not save fit measurement right now.";
          setStatus({ type: "error", message });
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-display text-xl font-semibold text-orange-950">Add fit measurement</h3>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-orange-900">
          Date
          <input
            name="date"
            type="date"
            className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
            required
          />
        </label>
        <label className="text-sm text-orange-900">
          Saddle height (mm)
          <input
            name="saddleHeightMm"
            type="number"
            className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
          />
        </label>
        <label className="text-sm text-orange-900">
          Saddle setback (mm)
          <input
            name="saddleSetbackMm"
            type="number"
            className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
          />
        </label>
        <label className="text-sm text-orange-900">
          Saddle tilt (deg)
          <input
            name="saddleTiltDeg"
            type="number"
            step="0.1"
            className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
          />
        </label>
        <label className="text-sm text-orange-900">
          Stem length (mm)
          <input
            name="stemLengthMm"
            type="number"
            defaultValue={110}
            className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
          />
        </label>
        <label className="text-sm text-orange-900">
          Handlebar width (mm)
          <input
            name="handlebarWidthMm"
            type="number"
            defaultValue={420}
            className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
          />
        </label>
        <label className="text-sm text-orange-900">
          Crank length (mm)
          <input
            name="crankLengthMm"
            type="number"
            step="0.5"
            defaultValue={172.5}
            className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
          />
        </label>
        <label className="text-sm text-orange-900">
          Spacer stack (mm)
          <input
            name="spacerStackMm"
            type="number"
            className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
          />
        </label>
        <label className="text-sm text-orange-900">
          Reach to hoods (mm)
          <input
            name="reachToHoodsMm"
            type="number"
            className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2 pt-6 text-sm text-orange-900">
          <input
            name="isCurrent"
            type="checkbox"
            className="h-4 w-4 rounded border-orange-300 text-orange-600"
          />
          Mark as current fit
        </label>
      </div>

      <label className="mt-3 block text-sm text-orange-900">
        Cleat notes
        <input
          name="cleatNotes"
          type="text"
          className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
        />
      </label>

      <label className="mt-3 block text-sm text-orange-900">
        Notes
        <textarea
          name="notes"
          className="mt-1 h-20 w-full rounded-xl border border-orange-200 px-3 py-2"
        />
      </label>

      <button
        type="submit"
        disabled={isSubmitting || disabled}
        className="mt-4 rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Saving..." : "Save measurement"}
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
