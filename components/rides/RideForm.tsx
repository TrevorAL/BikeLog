"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ROAD_CONDITIONS, RIDE_TYPES } from "@/lib/ride-options";

type RideFormProps = {
  bikeId?: string;
  disabled?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
};

type FormStatus = {
  type: "idle" | "success" | "error";
  message?: string;
  suggestions?: string[];
};

function parseOptionalText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function RideForm({
  bikeId,
  disabled = false,
  collapsible = false,
  defaultOpen = false,
}: RideFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<FormStatus>({ type: "idle" });
  const [isOpen, setIsOpen] = useState(() => !collapsible || defaultOpen);

  return (
    <form
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      onSubmit={async (event) => {
        event.preventDefault();

        if (disabled) {
          setStatus({
            type: "error",
            message: "Seed a bike first to enable ride logging.",
          });
          return;
        }

        const form = event.currentTarget;
        const formData = new FormData(form);

        const distanceMiles = Number(formData.get("distanceMiles"));
        const durationValue = formData.get("durationMinutes");
        const durationMinutes =
          typeof durationValue === "string" && durationValue.length > 0
            ? Number(durationValue)
            : undefined;

        setIsSubmitting(true);
        setStatus({ type: "idle" });

        try {
          const response = await fetch("/api/rides", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              bikeId,
              date: formData.get("date"),
              distanceMiles,
              durationMinutes,
              rideType: formData.get("rideType"),
              weather: parseOptionalText(formData.get("weather")),
              roadCondition: parseOptionalText(formData.get("roadCondition")),
              wasWet: formData.get("wasWet") === "on",
              notes: parseOptionalText(formData.get("notes")),
            }),
          });

          const result = (await response.json()) as {
            error?: string;
            suggestions?: string[];
          };

          if (!response.ok) {
            throw new Error(result.error ?? "Could not save ride.");
          }

          form.reset();

          setStatus({
            type: "success",
            message: "Ride saved. Component mileage updated.",
            suggestions: result.suggestions,
          });

          router.refresh();
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Could not save ride right now.";

          setStatus({
            type: "error",
            message,
          });
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-semibold text-slate-900">Log a ride</h3>
          <p className="text-sm text-slate-600">
            Saved rides automatically update mileage on active wear-based components.
          </p>
        </div>

        {collapsible ? (
          <button
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            disabled={disabled}
            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isOpen ? "Hide form" : "Log a ride"}
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <>
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
              Distance (mi)
              <input
                name="distanceMiles"
                type="number"
                min="0.1"
                step="0.1"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                required
              />
            </label>
            <label className="text-sm text-slate-700">
              Duration (minutes)
              <input
                name="durationMinutes"
                type="number"
                min="0"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-700">
              Ride type
              <select
                name="rideType"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                defaultValue="OUTDOOR"
              >
                {RIDE_TYPES.map((rideType) => (
                  <option key={rideType} value={rideType}>
                    {rideType.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-700">
              Weather
              <input
                name="weather"
                type="text"
                placeholder="Optional"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-700">
              Road condition
              <select
                name="roadCondition"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                defaultValue="Normal"
              >
                {ROAD_CONDITIONS.map((condition) => (
                  <option key={condition} value={condition}>
                    {condition}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 pt-6 text-sm text-slate-700">
              <input
                name="wasWet"
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-600"
              />
              Ride was wet
            </label>
          </div>

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
            className="mt-4 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : "Save ride"}
          </button>

          {status.type === "success" && status.message ? (
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {status.message}
            </p>
          ) : null}

          {status.type === "error" && status.message ? (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {status.message}
            </p>
          ) : null}

          {status.type === "success" && status.suggestions && status.suggestions.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {status.suggestions.map((suggestion) => (
                <li
                  key={suggestion}
                  className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-600">
          Tap <span className="font-semibold">Log a ride</span> to open the entry form.
        </p>
      )}
    </form>
  );
}
