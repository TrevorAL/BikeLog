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
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
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
        <h3 className="font-display text-lg font-semibold tracking-tight text-slate-900">Add fit measurement</h3>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-slate-700">
          Date
          <input
            name="date"
            type="date"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            required
          />
        </label>
        <label className="text-sm text-slate-700">
          Saddle height (mm)
          <input
            name="saddleHeightMm"
            type="number"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="text-sm text-slate-700">
          Saddle setback (mm)
          <input
            name="saddleSetbackMm"
            type="number"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="text-sm text-slate-700">
          Saddle tilt (deg)
          <input
            name="saddleTiltDeg"
            type="number"
            step="0.1"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="text-sm text-slate-700">
          Stem length (mm)
          <input
            name="stemLengthMm"
            type="number"
            defaultValue={110}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="text-sm text-slate-700">
          Handlebar width (mm)
          <input
            name="handlebarWidthMm"
            type="number"
            defaultValue={420}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="text-sm text-slate-700">
          Crank length (mm)
          <input
            name="crankLengthMm"
            type="number"
            step="0.5"
            defaultValue={172.5}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="text-sm text-slate-700">
          Spacer stack (mm)
          <input
            name="spacerStackMm"
            type="number"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="text-sm text-slate-700">
          Reach to hoods (mm)
          <input
            name="reachToHoodsMm"
            type="number"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2 pt-6 text-sm text-slate-700">
          <input
            name="isCurrent"
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-slate-600"
          />
          Mark as current fit
        </label>
      </div>

      <label className="mt-3 block text-sm text-slate-700">
        Cleat notes
        <input
          name="cleatNotes"
          type="text"
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
        />
      </label>

      <label className="mt-3 block text-sm text-slate-700">
        Notes
        <textarea
          name="notes"
          className="mt-1 h-20 w-full rounded-xl border border-slate-200 px-3 py-2"
        />
      </label>

      <button
        type="submit"
        disabled={isSubmitting || disabled}
        className="mt-4 rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Saving..." : "Save measurement"}
      </button>

      {status.type === "success" && status.message ? (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {status.message}
        </p>
      ) : null}

      {status.type === "error" && status.message ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{status.message}</p>
      ) : null}
    </form>
  );
}
