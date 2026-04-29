"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { MAINTENANCE_EVENT_TYPES } from "@/lib/maintenance-options";

type MaintenanceHistoryComponent = {
  id: string;
  name: string;
  currentMileage: number;
};

type MaintenanceHistoryEvent = {
  id: string;
  date: string;
  type: string;
  mileageAtService: number | null;
  notes: string | null;
  componentId: string | null;
  componentName?: string;
};

type MaintenanceHistoryManagerProps = {
  events: MaintenanceHistoryEvent[];
  components: MaintenanceHistoryComponent[];
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

function toDateInputValue(dateInput: string) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function EditableMaintenanceEvent({
  event,
  components,
  disabled,
}: {
  event: MaintenanceHistoryEvent;
  components: MaintenanceHistoryComponent[];
  disabled: boolean;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<FormStatus>({ type: "idle" });
  const [componentId, setComponentId] = useState(event.componentId ?? "");
  const [mileageSource, setMileageSource] = useState<"manual" | "component">(
    event.componentId ? "component" : "manual",
  );
  const [manualMileageInput, setManualMileageInput] = useState(
    event.mileageAtService === null ? "" : String(event.mileageAtService),
  );
  const selectedComponent = components.find((component) => component.id === componentId);

  if (isEditing) {
    return (
      <form
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        onSubmit={async (submitEvent) => {
          submitEvent.preventDefault();
          const formData = new FormData(submitEvent.currentTarget);

          if (mileageSource === "component" && !componentId) {
            setStatus({
              type: "error",
              message: "Select a component to use component mileage.",
            });
            return;
          }

          const mileageAtService =
            manualMileageInput.length > 0 ? Number(manualMileageInput) : undefined;

          setIsSubmitting(true);
          setStatus({ type: "idle" });

          try {
            const response = await fetch(`/api/maintenance-events/${event.id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                date: formData.get("date"),
                type: formData.get("type"),
                componentId: componentId || undefined,
                mileageSource,
                mileageAtService,
                notes: parseOptionalText(formData.get("notes")),
              }),
            });

            const payload = (await response.json()) as { error?: string };
            if (!response.ok) {
              throw new Error(payload.error ?? "Could not update maintenance event.");
            }

            setStatus({ type: "success", message: "Maintenance event updated." });
            setIsEditing(false);
            router.refresh();
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Could not update maintenance event right now.";
            setStatus({ type: "error", message });
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-lg font-semibold text-slate-900">Edit maintenance</h3>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              setIsEditing(false);
              setStatus({ type: "idle" });
            }}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
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
              defaultValue={toDateInputValue(event.date)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              required
            />
          </label>
          <label className="text-sm text-slate-700">
            Event type
            <select
              name="type"
              defaultValue={event.type}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
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
              value={componentId}
              onChange={(changeEvent) => setComponentId(changeEvent.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
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
              value={manualMileageInput}
              onChange={(changeEvent) => setManualMileageInput(changeEvent.target.value)}
              disabled={mileageSource === "component"}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
            {mileageSource === "component" ? (
              <p className="mt-1 text-xs text-slate-600">
                {selectedComponent
                  ? `Will use ${selectedComponent.currentMileage.toFixed(1)} mi from ${selectedComponent.name}.`
                  : "Select a component to use its current mileage."}
              </p>
            ) : null}
          </label>
        </div>

        <label className="mt-3 block text-sm text-slate-700">
          Notes
          <textarea
            name="notes"
            defaultValue={event.notes ?? ""}
            className="mt-1 h-20 w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting || disabled}
          className="mt-4 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : "Save changes"}
        </button>

        {status.type === "error" && status.message ? (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{status.message}</p>
        ) : null}
      </form>
    );
  }

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-600">
        {new Date(event.date).toLocaleDateString()}
      </p>
      <h3 className="font-display mt-1 text-lg font-semibold text-slate-900">
        {event.type.replaceAll("_", " ")}
      </h3>
      <p className="text-sm text-slate-600">{event.componentName ?? "General bike service"}</p>
      <div className="mt-3 space-y-1 text-sm text-slate-600">
        {typeof event.mileageAtService === "number" ? (
          <p>Mileage: {event.mileageAtService.toFixed(1)} mi</p>
        ) : null}
        {event.notes ? <p>Notes: {event.notes}</p> : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || isSubmitting}
          onClick={() => {
            setIsEditing(true);
            setStatus({ type: "idle" });
          }}
          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Edit
        </button>
        <button
          type="button"
          disabled={disabled || isSubmitting}
          onClick={async () => {
            const shouldDelete = window.confirm(
              "Delete this maintenance event from history?",
            );
            if (!shouldDelete) {
              return;
            }

            setIsSubmitting(true);
            setStatus({ type: "idle" });

            try {
              const response = await fetch(`/api/maintenance-events/${event.id}`, {
                method: "DELETE",
              });

              const payload = (await response.json()) as { error?: string };
              if (!response.ok) {
                throw new Error(payload.error ?? "Could not delete maintenance event.");
              }

              setStatus({ type: "success", message: "Maintenance event deleted." });
              router.refresh();
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : "Could not delete maintenance event right now.";
              setStatus({ type: "error", message });
            } finally {
              setIsSubmitting(false);
            }
          }}
          className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Working..." : "Delete"}
        </button>
      </div>

      {status.type === "success" && status.message ? (
        <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {status.message}
        </p>
      ) : null}

      {status.type === "error" && status.message ? (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{status.message}</p>
      ) : null}
    </article>
  );
}

export function MaintenanceHistoryManager({
  events,
  components,
  disabled = false,
}: MaintenanceHistoryManagerProps) {
  const [componentFilter, setComponentFilter] = useState("all");

  const componentOptions = useMemo(() => {
    const optionMap = new Map<string, string>();

    for (const component of components) {
      optionMap.set(component.id, component.name);
    }

    for (const event of events) {
      if (event.componentId && event.componentName && !optionMap.has(event.componentId)) {
        optionMap.set(event.componentId, event.componentName);
      }
    }

    return [...optionMap.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [components, events]);

  const filteredEvents = useMemo(() => {
    if (componentFilter === "all") {
      return events;
    }

    if (componentFilter === "general") {
      return events.filter((event) => !event.componentId);
    }

    return events.filter((event) => event.componentId === componentFilter);
  }, [componentFilter, events]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="text-sm text-slate-700">
          Filter by component
          <select
            value={componentFilter}
            onChange={(event) => setComponentFilter(event.target.value)}
            className="mt-1 block min-w-56 rounded-xl border border-slate-200 px-3 py-2"
          >
            <option value="all">All maintenance events</option>
            <option value="general">General bike service</option>
            {componentOptions.map((component) => (
              <option key={component.id} value={component.id}>
                {component.name}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-slate-600">
          Showing {filteredEvents.length} of {events.length}
        </p>
      </div>

      {filteredEvents.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredEvents.map((event) => (
            <EditableMaintenanceEvent
              key={event.id}
              event={event}
              components={components}
              disabled={disabled}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
          No maintenance events match this component filter.
        </p>
      )}
    </div>
  );
}
