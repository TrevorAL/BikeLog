"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { MAINTENANCE_EVENT_TYPES } from "@/lib/maintenance-options";

type MaintenanceFormComponent = {
  id: string;
  name: string;
  currentMileage: number;
};

type MaintenanceFormProps = {
  bikeId?: string;
  components: MaintenanceFormComponent[];
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

export function MaintenanceForm({ bikeId, components, disabled = false }: MaintenanceFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<FormStatus>({ type: "idle" });
  const [mileageSource, setMileageSource] = useState<"manual" | "component">("manual");
  const [selectedComponentId, setSelectedComponentId] = useState("");
  const selectedComponent = components.find((component) => component.id === selectedComponentId);

  return (
    <form
      className="rounded-3xl border border-orange-200 bg-white p-5 shadow-warm"
      onSubmit={async (event) => {
        event.preventDefault();

        if (disabled) {
          setStatus({
            type: "error",
            message: "Seed a bike first to enable maintenance logging.",
          });
          return;
        }

        const form = event.currentTarget;
        const formData = new FormData(form);
        const mileageSourceInput =
          formData.get("mileageSource") === "component" ? "component" : "manual";
        const componentId = parseOptionalText(formData.get("componentId"));

        if (mileageSourceInput === "component" && !componentId) {
          setStatus({
            type: "error",
            message: "Select a component to use component mileage.",
          });
          return;
        }

        const mileageValue = formData.get("mileageAtService");
        const mileageAtServiceManual =
          typeof mileageValue === "string" && mileageValue.length > 0
            ? Number(mileageValue)
            : undefined;

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
              date: formData.get("date"),
              type: formData.get("type"),
              componentId,
              mileageSource: mileageSourceInput,
              mileageAtService: mileageAtServiceManual,
              notes: parseOptionalText(formData.get("notes")),
            }),
          });

          const result = (await response.json()) as {
            error?: string;
          };

          if (!response.ok) {
            throw new Error(result.error ?? "Could not save maintenance event.");
          }

          form.reset();
          setMileageSource("manual");
          setSelectedComponentId("");
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
        <h3 className="font-display text-xl font-semibold text-orange-950">Log maintenance</h3>
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
          Event type
          <select
            name="type"
            className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
            defaultValue="LUBED_CHAIN"
          >
            {MAINTENANCE_EVENT_TYPES.map((maintenanceType) => (
              <option key={maintenanceType} value={maintenanceType}>
                {maintenanceType.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-orange-900">
          Component
          <select
            name="componentId"
            className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
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
        <fieldset className="text-sm text-orange-900">
          <legend>Mileage source</legend>
          <div className="mt-1 flex flex-wrap gap-4 rounded-xl border border-orange-200 px-3 py-2">
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
        <label className="text-sm text-orange-900">
          Mileage at service
          <input
            name="mileageAtService"
            type="number"
            min="0"
            step="0.1"
            className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
            disabled={mileageSource === "component"}
          />
          {mileageSource === "manual" ? (
            <p className="mt-1 text-xs text-orange-900/70">
              Enter mileage manually, or switch source to use the selected component.
            </p>
          ) : (
            <p className="mt-1 text-xs text-orange-900/70">
              {selectedComponent
                ? `Will use ${selectedComponent.currentMileage.toFixed(1)} mi from ${selectedComponent.name}.`
                : "Select a component to use its current mileage."}
            </p>
          )}
        </label>
      </div>

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
        {isSubmitting ? "Saving..." : "Save event"}
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
