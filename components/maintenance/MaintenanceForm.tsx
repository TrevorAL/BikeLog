"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { MAINTENANCE_EVENT_TYPES } from "@/lib/maintenance-options";

type MaintenanceFormComponent = {
  id: string;
  name: string;
  currentMileage: number;
};

export type MaintenanceFormPrefill = {
  token: number;
  type: (typeof MAINTENANCE_EVENT_TYPES)[number];
  componentId?: string;
  mileageSource: "manual" | "component";
  mileageAtService?: number;
  notes?: string;
};

type MaintenanceFormProps = {
  bikeId?: string;
  bikeCurrentMileage: number;
  components: MaintenanceFormComponent[];
  disabled?: boolean;
  prefill?: MaintenanceFormPrefill;
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

function getTodayDateInputValue() {
  const now = new Date();
  const timezoneOffsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

export function MaintenanceForm({
  bikeId,
  bikeCurrentMileage,
  components,
  disabled = false,
  prefill,
}: MaintenanceFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<FormStatus>(
    prefill
      ? {
          type: "success",
          message: "Maintenance form prefilled from reminder.",
        }
      : { type: "idle" },
  );
  const [date, setDate] = useState(getTodayDateInputValue);
  const [eventType, setEventType] =
    useState<(typeof MAINTENANCE_EVENT_TYPES)[number]>(prefill?.type ?? "LUBED_CHAIN");
  const [mileageSource, setMileageSource] = useState<"manual" | "component">(
    prefill?.mileageSource ?? "manual",
  );
  const [selectedComponentId, setSelectedComponentId] = useState(prefill?.componentId ?? "");
  const [mileageAtServiceInput, setMileageAtServiceInput] = useState(
    prefill?.mileageAtService === undefined
      ? bikeCurrentMileage.toFixed(1)
      : String(prefill.mileageAtService),
  );
  const [notes, setNotes] = useState(prefill?.notes ?? "");
  const selectedComponent = components.find((component) => component.id === selectedComponentId);

  return (
    <form
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      onSubmit={async (event) => {
        event.preventDefault();

        if (disabled) {
          setStatus({
            type: "error",
            message: "Seed a bike first to enable maintenance logging.",
          });
          return;
        }

        const componentId = selectedComponentId || undefined;

        if (mileageSource === "component" && !componentId) {
          setStatus({
            type: "error",
            message: "Select a component to use component mileage.",
          });
          return;
        }

        const mileageAtServiceManual =
          mileageAtServiceInput.length > 0
            ? Number(mileageAtServiceInput)
            : bikeCurrentMileage;

        setIsSubmitting(true);
        setStatus({ type: "idle" });

        try {
          const response = await fetch("/api/maintenance-events", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              bikeId,
              date,
              type: eventType,
              componentId,
              mileageSource,
              mileageAtService: mileageAtServiceManual,
              notes: parseOptionalText(notes),
            }),
          });

          const result = (await response.json()) as {
            error?: string;
          };

          if (!response.ok) {
            throw new Error(result.error ?? "Could not save maintenance event.");
          }

          setDate(getTodayDateInputValue());
          setEventType("LUBED_CHAIN");
          setMileageSource("manual");
          setSelectedComponentId("");
          setMileageAtServiceInput(bikeCurrentMileage.toFixed(1));
          setNotes("");
          setStatus({
            type: "success",
            message: "Maintenance event saved.",
          });

          router.refresh();
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Could not save maintenance event right now.";

          setStatus({
            type: "error",
            message,
          });
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-display text-lg font-semibold tracking-tight text-slate-900">Log maintenance</h3>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-slate-700">
          Date
          <input
            name="date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            required
          />
        </label>
        <label className="text-sm text-slate-700">
          Event type
          <select
            name="type"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            value={eventType}
            onChange={(event) =>
              setEventType(event.target.value as (typeof MAINTENANCE_EVENT_TYPES)[number])
            }
          >
            {MAINTENANCE_EVENT_TYPES.map((maintenanceType) => (
              <option key={maintenanceType} value={maintenanceType}>
                {maintenanceType.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-700">
          Component
          <select
            name="componentId"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            value={selectedComponentId}
            onChange={(event) => setSelectedComponentId(event.target.value)}
          >
            <option value="">General bike service</option>
            {components.map((component) => (
              <option key={component.id} value={component.id}>
                {component.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="text-sm text-slate-700">
          <legend>Mileage source</legend>
          <div className="mt-1 flex flex-wrap gap-4 rounded-xl border border-slate-200 px-3 py-2">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="mileageSource"
                value="manual"
                checked={mileageSource === "manual"}
                onChange={() => setMileageSource("manual")}
              />
              Type current miles
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="mileageSource"
                value="component"
                checked={mileageSource === "component"}
                onChange={() => setMileageSource("component")}
              />
              Use selected component mileage
            </label>
          </div>
        </fieldset>
        <label className="text-sm text-slate-700">
          Mileage at service
          <input
            name="mileageAtService"
            type="number"
            min="0"
            step="0.1"
            value={mileageAtServiceInput}
            onChange={(event) => setMileageAtServiceInput(event.target.value)}
            placeholder={bikeCurrentMileage.toFixed(1)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            disabled={mileageSource === "component"}
          />
          {mileageSource === "manual" ? (
            <p className="mt-1 text-xs text-slate-600">
              Defaults to current bike mileage ({bikeCurrentMileage.toFixed(1)} mi). Enter
              manually, or switch source to use the selected component.
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-600">
              {selectedComponent
                ? `Will use ${selectedComponent.currentMileage.toFixed(1)} mi from ${selectedComponent.name}.`
                : "Select a component to use its current mileage."}
            </p>
          )}
        </label>
      </div>

      <label className="mt-3 block text-sm text-slate-700">
        Notes
        <textarea
          name="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="mt-1 h-20 w-full rounded-xl border border-slate-200 px-3 py-2"
        />
      </label>

      <button
        type="submit"
        disabled={isSubmitting || disabled}
        className="mt-4 rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Saving..." : "Save event"}
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
