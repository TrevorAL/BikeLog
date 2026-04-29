"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ROAD_CONDITIONS, RIDE_TYPES } from "@/lib/ride-options";
import { RideCard } from "@/components/rides/RideCard";

type RideListItem = {
  id: string;
  date: string;
  distanceMiles: number;
  durationMinutes: number | null;
  rideType: string;
  weather: string | null;
  roadCondition: string | null;
  wasWet: boolean;
  notes: string | null;
};

type RideListProps = {
  rides: RideListItem[];
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

function toDateInputValue(dateInput: string) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function EditableRideCard({ ride }: { ride: RideListItem }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<FormStatus>({ type: "idle" });

  const isBusy = isSubmitting;

  return isEditing ? (
    <form
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      onSubmit={async (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        setIsSubmitting(true);
        setStatus({ type: "idle" });

        try {
          const distanceMiles = Number(formData.get("distanceMiles"));
          const durationValue = formData.get("durationMinutes");
          const durationMinutes =
            typeof durationValue === "string" && durationValue.length > 0
              ? Number(durationValue)
              : undefined;

          const response = await fetch(`/api/rides/${ride.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
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
            throw new Error(result.error ?? "Could not update ride.");
          }

          setStatus({
            type: "success",
            message: "Ride updated. Mileage adjusted.",
            suggestions: result.suggestions,
          });

          setIsEditing(false);
          router.refresh();
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Could not update ride right now.";

          setStatus({
            type: "error",
            message,
          });
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold text-slate-900">Edit ride</h3>
        <button
          type="button"
          onClick={() => {
            setIsEditing(false);
            setStatus({ type: "idle" });
          }}
          className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-slate-700">
          Date
          <input
            name="date"
            type="date"
            defaultValue={toDateInputValue(ride.date)}
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
            defaultValue={ride.distanceMiles}
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
            defaultValue={ride.durationMinutes ?? ""}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="text-sm text-slate-700">
          Ride type
          <select
            name="rideType"
            defaultValue={ride.rideType}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
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
            defaultValue={ride.weather ?? ""}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="text-sm text-slate-700">
          Road condition
          <select
            name="roadCondition"
            defaultValue={ride.roadCondition ?? "Normal"}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
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
            defaultChecked={ride.wasWet}
            className="h-4 w-4 rounded border-slate-300 text-slate-600"
          />
          Ride was wet
        </label>
      </div>

      <label className="mt-3 block text-sm text-slate-700">
        Notes
        <textarea
          name="notes"
          defaultValue={ride.notes ?? ""}
          className="mt-1 h-20 w-full rounded-xl border border-slate-200 px-3 py-2"
        />
      </label>

      <button
        type="submit"
        disabled={isBusy}
        className="mt-4 rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isBusy ? "Saving..." : "Save changes"}
      </button>

      {status.type === "error" && status.message ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{status.message}</p>
      ) : null}
    </form>
  ) : (
    <div>
      <RideCard
        date={ride.date}
        distanceMiles={ride.distanceMiles}
        durationMinutes={ride.durationMinutes}
        rideType={ride.rideType}
        weather={ride.weather}
        roadCondition={ride.roadCondition}
        wasWet={ride.wasWet}
        notes={ride.notes}
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setIsEditing(true);
                setStatus({ type: "idle" });
              }}
              disabled={isBusy}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={async () => {
                const shouldDelete = window.confirm(
                  "Delete this ride? This will also decrement component mileage.",
                );

                if (!shouldDelete) {
                  return;
                }

                setIsSubmitting(true);
                setStatus({ type: "idle" });

                try {
                  const response = await fetch(`/api/rides/${ride.id}`, {
                    method: "DELETE",
                  });

                  const result = (await response.json()) as { error?: string };

                  if (!response.ok) {
                    throw new Error(result.error ?? "Could not delete ride.");
                  }

                  setStatus({
                    type: "success",
                    message: "Ride deleted. Mileage adjusted.",
                  });
                  router.refresh();
                } catch (error) {
                  const message =
                    error instanceof Error ? error.message : "Could not delete ride right now.";

                  setStatus({
                    type: "error",
                    message,
                  });
                } finally {
                  setIsSubmitting(false);
                }
              }}
              disabled={isBusy}
              className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBusy ? "Working..." : "Delete"}
            </button>
          </div>
        }
      />

      {status.type === "error" && status.message ? (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{status.message}</p>
      ) : null}

      {status.type === "success" && status.message ? (
        <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {status.message}
        </p>
      ) : null}

      {status.type === "success" && status.suggestions && status.suggestions.length > 0 ? (
        <ul className="mt-2 space-y-2">
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
    </div>
  );
}

export function RideList({ rides }: RideListProps) {
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {rides.map((ride) => (
        <EditableRideCard key={ride.id} ride={ride} />
      ))}
    </div>
  );
}
