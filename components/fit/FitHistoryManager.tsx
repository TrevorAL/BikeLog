"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FitMeasurementItem = {
  id: string;
  date: string;
  saddleHeightMm: number | null;
  saddleSetbackMm: number | null;
  saddleTiltDeg: number | null;
  stemLengthMm: number | null;
  handlebarWidthMm: number | null;
  crankLengthMm: number | null;
  spacerStackMm: number | null;
  reachToHoodsMm: number | null;
  cleatNotes: string | null;
  notes: string | null;
  isCurrent: boolean;
};

type FitHistoryManagerProps = {
  measurements: FitMeasurementItem[];
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

function toDateInputValue(dateInput: string) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function EditableFitMeasurement({
  measurement,
  disabled,
  onSuccess,
}: {
  measurement: FitMeasurementItem;
  disabled: boolean;
  onSuccess: (message: string) => void;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [status, setStatus] = useState<FormStatus>({ type: "idle" });

  if (isEditing) {
    return (
      <form
        className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 text-sm"
        onSubmit={async (event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);

          setIsSubmitting(true);
          setStatus({ type: "idle" });

          try {
            const response = await fetch(`/api/fit-measurements/${measurement.id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
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
              }),
            });

            const payload = (await response.json()) as { error?: string };

            if (!response.ok) {
              throw new Error(payload.error ?? "Could not update fit measurement.");
            }

            setIsEditing(false);
            onSuccess("Fit measurement updated.");
            router.refresh();
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Could not update fit measurement right now.";
            setStatus({ type: "error", message });
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-slate-900">Edit fit measurement</p>
          <button
            type="button"
            onClick={() => {
              setIsEditing(false);
              setStatus({ type: "idle" });
            }}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label>
            Date
            <input
              name="date"
              type="date"
              defaultValue={toDateInputValue(measurement.date)}
              required
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5"
            />
          </label>
          <label>
            Saddle height (mm)
            <input
              name="saddleHeightMm"
              type="number"
              defaultValue={measurement.saddleHeightMm ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5"
            />
          </label>
          <label>
            Saddle setback (mm)
            <input
              name="saddleSetbackMm"
              type="number"
              defaultValue={measurement.saddleSetbackMm ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5"
            />
          </label>
          <label>
            Saddle tilt (deg)
            <input
              name="saddleTiltDeg"
              type="number"
              step="0.1"
              defaultValue={measurement.saddleTiltDeg ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5"
            />
          </label>
          <label>
            Stem length (mm)
            <input
              name="stemLengthMm"
              type="number"
              defaultValue={measurement.stemLengthMm ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5"
            />
          </label>
          <label>
            Handlebar width (mm)
            <input
              name="handlebarWidthMm"
              type="number"
              defaultValue={measurement.handlebarWidthMm ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5"
            />
          </label>
          <label>
            Crank length (mm)
            <input
              name="crankLengthMm"
              type="number"
              step="0.1"
              defaultValue={measurement.crankLengthMm ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5"
            />
          </label>
          <label>
            Spacer stack (mm)
            <input
              name="spacerStackMm"
              type="number"
              defaultValue={measurement.spacerStackMm ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5"
            />
          </label>
          <label>
            Reach to hoods (mm)
            <input
              name="reachToHoodsMm"
              type="number"
              defaultValue={measurement.reachToHoodsMm ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5"
            />
          </label>
          <label>
            Cleat notes
            <input
              name="cleatNotes"
              type="text"
              defaultValue={measurement.cleatNotes ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5"
            />
          </label>
        </div>

        <label className="mt-2 block">
          Notes
          <textarea
            name="notes"
            defaultValue={measurement.notes ?? ""}
            className="mt-1 h-16 w-full rounded-lg border border-slate-200 px-2 py-1.5"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting || isDeleting || disabled}
          className="mt-3 rounded-md bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : "Save changes"}
        </button>

        {status.type === "error" && status.message ? (
          <p className="mt-2 rounded-lg bg-red-50 px-2 py-1.5 text-xs text-red-800">
            {status.message}
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <article className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-slate-900">{new Date(measurement.date).toLocaleDateString()}</p>
        <div className="flex flex-wrap items-center gap-2">
          {measurement.isCurrent ? (
            <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
              Current
            </span>
          ) : (
            <button
              type="button"
              disabled={disabled || isSubmitting || isDeleting}
              onClick={async () => {
                setIsSubmitting(true);
                setStatus({ type: "idle" });

                try {
                  const response = await fetch(
                    `/api/fit-measurements/${measurement.id}/mark-current`,
                    { method: "POST" },
                  );

                  const payload = (await response.json()) as { error?: string };

                  if (!response.ok) {
                    throw new Error(payload.error ?? "Could not mark as current.");
                  }

                  onSuccess("Current fit updated.");
                  router.refresh();
                } catch (error) {
                  const message =
                    error instanceof Error
                      ? error.message
                      : "Could not mark fit as current right now.";
                  setStatus({ type: "error", message });
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="rounded-md border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Updating..." : "Mark current"}
            </button>
          )}

          <button
            type="button"
            disabled={disabled || isSubmitting || isDeleting}
            onClick={() => {
              setIsEditing(true);
              setStatus({ type: "idle" });
            }}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Edit
          </button>
          <button
            type="button"
            disabled={disabled || isSubmitting || isDeleting}
            onClick={async () => {
              const confirmed = window.confirm(
                `Delete fit measurement from ${new Date(measurement.date).toLocaleDateString()}?`,
              );
              if (!confirmed) {
                return;
              }

              setIsDeleting(true);
              setStatus({ type: "idle" });

              try {
                const response = await fetch(`/api/fit-measurements/${measurement.id}`, {
                  method: "DELETE",
                });
                const payload = (await response.json()) as { error?: string };

                if (!response.ok) {
                  throw new Error(payload.error ?? "Could not delete fit measurement.");
                }

                onSuccess("Fit measurement deleted.");
                router.refresh();
              } catch (error) {
                const message =
                  error instanceof Error
                    ? error.message
                    : "Could not delete fit measurement right now.";
                setStatus({ type: "error", message });
              } finally {
                setIsDeleting(false);
              }
            }}
            className="rounded-md border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      <p className="mt-1 text-slate-600">
        Saddle {measurement.saddleHeightMm ?? "-"} mm · Reach {measurement.reachToHoodsMm ?? "-"} mm
      </p>

      {status.type === "error" && status.message ? (
        <p className="mt-2 rounded-lg bg-red-50 px-2 py-1.5 text-xs text-red-800">{status.message}</p>
      ) : null}
    </article>
  );
}

export function FitHistoryManager({ measurements, disabled = false }: FitHistoryManagerProps) {
  const [status, setStatus] = useState<FormStatus>({ type: "idle" });

  if (measurements.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
        No fit measurements yet. Add your first measurement above.
      </p>
    );
  }

  return (
    <div>
      {status.type === "success" && status.message ? (
        <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {status.message}
        </p>
      ) : null}
      <div className="space-y-2">
        {measurements.map((measurement) => (
          <EditableFitMeasurement
            key={measurement.id}
            measurement={measurement}
            disabled={disabled}
            onSuccess={(message) => setStatus({ type: "success", message })}
          />
        ))}
      </div>
    </div>
  );
}
