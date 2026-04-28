"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ComponentCard } from "@/components/components/ComponentCard";
import { COMPONENT_TYPES, DEFAULT_COMPONENT_NAME_BY_TYPE, formatComponentType } from "@/lib/component-options";
import type { MaintenanceStatus } from "@/lib/constants";

type ComponentListItem = {
  id: string;
  type: string;
  name: string;
  brand: string | null;
  model: string | null;
  installDate: string | null;
  currentMileage: number;
  notes: string | null;
  conditionStatus: MaintenanceStatus;
  nextMaintenance: string;
};

type ComponentManagerProps = {
  bikeId?: string;
  components: ComponentListItem[];
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

function toDateInputValue(dateInput: string | null | undefined) {
  if (!dateInput) {
    return "";
  }

  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function AddComponentForm({
  bikeId,
  disabled,
  onSuccess,
}: {
  bikeId?: string;
  disabled: boolean;
  onSuccess: (message: string) => void;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState<(typeof COMPONENT_TYPES)[number]>("CHAIN");
  const [status, setStatus] = useState<FormStatus>({ type: "idle" });

  return (
    <form
      className="mb-4 rounded-3xl border border-orange-200 bg-white p-4 shadow-warm"
      onSubmit={async (event) => {
        event.preventDefault();

        if (disabled) {
          setStatus({ type: "error", message: "Seed a bike first to add components." });
          return;
        }

        const form = event.currentTarget;
        const formData = new FormData(form);
        const currentMileageInput = formData.get("currentMileage");
        const currentMileage =
          typeof currentMileageInput === "string" && currentMileageInput.length > 0
            ? Number(currentMileageInput)
            : undefined;

        setIsSubmitting(true);
        setStatus({ type: "idle" });

        try {
          const response = await fetch("/api/components", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              bikeId,
              type: formData.get("type"),
              name: parseOptionalText(formData.get("name")) ?? DEFAULT_COMPONENT_NAME_BY_TYPE[selectedType],
              brand: parseOptionalText(formData.get("brand")),
              model: parseOptionalText(formData.get("model")),
              installDate: parseOptionalText(formData.get("installDate")),
              currentMileage,
              notes: parseOptionalText(formData.get("notes")),
            }),
          });

          const result = (await response.json()) as { error?: string };

          if (!response.ok) {
            throw new Error(result.error ?? "Could not add component.");
          }

          form.reset();
          setSelectedType("CHAIN");
          setStatus({ type: "success", message: "Component added." });
          onSuccess("Component added.");
          router.refresh();
        } catch (error) {
          const message = error instanceof Error ? error.message : "Could not add component right now.";
          setStatus({ type: "error", message });
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <h3 className="font-display text-lg font-semibold text-orange-950">Add component</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-orange-900">
          Type
          <select
            name="type"
            value={selectedType}
            onChange={(event) =>
              setSelectedType(event.target.value as (typeof COMPONENT_TYPES)[number])
            }
            className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
          >
            {COMPONENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {formatComponentType(type)}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-orange-900">
          Name
          <input
            name="name"
            type="text"
            placeholder={DEFAULT_COMPONENT_NAME_BY_TYPE[selectedType]}
            className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
          />
        </label>

        <label className="text-sm text-orange-900">
          Brand
          <input name="brand" type="text" className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2" />
        </label>

        <label className="text-sm text-orange-900">
          Model
          <input name="model" type="text" className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2" />
        </label>

        <label className="text-sm text-orange-900">
          Install date
          <input
            name="installDate"
            type="date"
            className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
          />
        </label>

        <label className="text-sm text-orange-900">
          Current mileage
          <input
            name="currentMileage"
            type="number"
            min="0"
            step="0.1"
            className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
          />
        </label>
      </div>

      <label className="mt-3 block text-sm text-orange-900">
        Notes
        <textarea name="notes" className="mt-1 h-20 w-full rounded-xl border border-orange-200 px-3 py-2" />
      </label>

      <button
        type="submit"
        disabled={isSubmitting || disabled}
        className="mt-4 rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Saving..." : "Add component"}
      </button>

      {status.type === "error" && status.message ? (
        <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-800">{status.message}</p>
      ) : null}
    </form>
  );
}

function EditableComponentCard({
  component,
  disabled,
  onSuccess,
}: {
  component: ComponentListItem;
  disabled: boolean;
  onSuccess: (message: string) => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit" | "replace">("view");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<FormStatus>({ type: "idle" });

  if (mode === "edit") {
    return (
      <form
        className="rounded-3xl border border-orange-200 bg-white p-4 shadow-warm"
        onSubmit={async (event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const currentMileageInput = formData.get("currentMileage");
          const currentMileage =
            typeof currentMileageInput === "string" && currentMileageInput.length > 0
              ? Number(currentMileageInput)
              : undefined;

          setIsSubmitting(true);
          setStatus({ type: "idle" });

          try {
            const response = await fetch(`/api/components/${component.id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: parseOptionalText(formData.get("name")),
                brand: parseOptionalText(formData.get("brand")),
                model: parseOptionalText(formData.get("model")),
                installDate: parseOptionalText(formData.get("installDate")),
                currentMileage,
                notes: parseOptionalText(formData.get("notes")),
              }),
            });

            const result = (await response.json()) as { error?: string };

            if (!response.ok) {
              throw new Error(result.error ?? "Could not update component.");
            }

            setMode("view");
            setStatus({ type: "idle" });
            onSuccess("Component updated.");
            router.refresh();
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Could not update component right now.";
            setStatus({ type: "error", message });
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold text-orange-950">Edit component</h3>
          <button
            type="button"
            onClick={() => {
              setMode("view");
              setStatus({ type: "idle" });
            }}
            className="rounded-full border border-orange-300 px-3 py-1 text-xs font-semibold text-orange-900 hover:bg-orange-100"
          >
            Cancel
          </button>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-orange-900">
            Name
            <input
              name="name"
              type="text"
              required
              defaultValue={component.name}
              className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
            />
          </label>

          <label className="text-sm text-orange-900">
            Type
            <input
              type="text"
              value={formatComponentType(component.type)}
              readOnly
              className="mt-1 w-full rounded-xl border border-orange-200 bg-orange-50 px-3 py-2"
            />
          </label>

          <label className="text-sm text-orange-900">
            Brand
            <input
              name="brand"
              type="text"
              defaultValue={component.brand ?? ""}
              className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
            />
          </label>

          <label className="text-sm text-orange-900">
            Model
            <input
              name="model"
              type="text"
              defaultValue={component.model ?? ""}
              className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
            />
          </label>

          <label className="text-sm text-orange-900">
            Install date
            <input
              name="installDate"
              type="date"
              defaultValue={toDateInputValue(component.installDate)}
              className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
            />
          </label>

          <label className="text-sm text-orange-900">
            Current mileage
            <input
              name="currentMileage"
              type="number"
              min="0"
              step="0.1"
              defaultValue={component.currentMileage}
              className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
            />
          </label>
        </div>

        <label className="mt-3 block text-sm text-orange-900">
          Notes
          <textarea
            name="notes"
            defaultValue={component.notes ?? ""}
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

  if (mode === "replace") {
    return (
      <form
        className="rounded-3xl border border-orange-200 bg-white p-4 shadow-warm"
        onSubmit={async (event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);

          setIsSubmitting(true);
          setStatus({ type: "idle" });

          try {
            const response = await fetch(`/api/components/${component.id}/replace`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: parseOptionalText(formData.get("name")),
                brand: parseOptionalText(formData.get("brand")),
                model: parseOptionalText(formData.get("model")),
                installDate: parseOptionalText(formData.get("installDate")),
                notes: parseOptionalText(formData.get("notes")),
              }),
            });

            const result = (await response.json()) as { error?: string };

            if (!response.ok) {
              throw new Error(result.error ?? "Could not replace component.");
            }

            setMode("view");
            setStatus({ type: "idle" });
            onSuccess("Component replaced. New active component created at 0 miles.");
            router.refresh();
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Could not replace component right now.";
            setStatus({ type: "error", message });
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold text-orange-950">Replace component</h3>
          <button
            type="button"
            onClick={() => {
              setMode("view");
              setStatus({ type: "idle" });
            }}
            className="rounded-full border border-orange-300 px-3 py-1 text-xs font-semibold text-orange-900 hover:bg-orange-100"
          >
            Cancel
          </button>
        </div>
        <p className="mt-2 text-sm text-orange-900/75">
          The current component will be marked replaced, and a new active one will start at 0 miles.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-orange-900">
            New name
            <input
              name="name"
              type="text"
              defaultValue={component.name}
              className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
            />
          </label>
          <label className="text-sm text-orange-900">
            New brand
            <input
              name="brand"
              type="text"
              defaultValue={component.brand ?? ""}
              className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
            />
          </label>
          <label className="text-sm text-orange-900">
            New model
            <input
              name="model"
              type="text"
              defaultValue={component.model ?? ""}
              className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
            />
          </label>
          <label className="text-sm text-orange-900">
            Install date
            <input
              name="installDate"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="mt-1 w-full rounded-xl border border-orange-200 px-3 py-2"
            />
          </label>
        </div>

        <label className="mt-3 block text-sm text-orange-900">
          Notes
          <textarea
            name="notes"
            defaultValue={component.notes ?? ""}
            className="mt-1 h-20 w-full rounded-xl border border-orange-200 px-3 py-2"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting || disabled}
          className="mt-4 rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Replacing..." : "Confirm replace"}
        </button>

        {status.type === "error" && status.message ? (
          <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-800">{status.message}</p>
        ) : null}
      </form>
    );
  }

  return (
    <div>
      <ComponentCard
        name={component.name}
        brandModel={`${component.brand ?? ""} ${component.model ?? ""}`.trim() || "No model set"}
        currentMileage={component.currentMileage}
        installDate={component.installDate ? new Date(component.installDate) : null}
        conditionStatus={component.conditionStatus}
        nextMaintenance={component.nextMaintenance}
        actions={
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setMode("edit");
                setStatus({ type: "idle" });
              }}
              className="rounded-full border border-orange-300 bg-white px-3 py-1.5 text-orange-800 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Edit
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setMode("replace");
                setStatus({ type: "idle" });
              }}
              className="rounded-full border border-orange-300 bg-white px-3 py-1.5 text-orange-800 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Replace
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

export function ComponentManager({ bikeId, components, disabled = false }: ComponentManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [status, setStatus] = useState<FormStatus>({ type: "idle" });

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-orange-950">Active components</h2>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setShowAddForm((previous) => !previous);
            setStatus({ type: "idle" });
          }}
          className="rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {showAddForm ? "Close" : "Add component"}
        </button>
      </div>

      {showAddForm ? (
        <AddComponentForm
          bikeId={bikeId}
          disabled={disabled}
          onSuccess={(message) => {
            setStatus({ type: "success", message });
            setShowAddForm(false);
          }}
        />
      ) : null}

      {status.type === "success" && status.message ? (
        <p className="mb-4 rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{status.message}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {components.map((component) => (
          <EditableComponentCard
            key={component.id}
            component={component}
            disabled={disabled}
            onSuccess={(message) => setStatus({ type: "success", message })}
          />
        ))}
      </div>
    </section>
  );
}
