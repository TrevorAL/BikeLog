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
  initialMileage: number;
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

type MileageRecalculationItem = {
  componentId: string;
  componentName: string;
  componentType: string;
  installDate: string | null;
  currentMileage: number;
  expectedMileage: number;
  deltaMileage: number;
  ridesUsed: number;
  willChange: boolean;
};

type MileageRecalculationResult = {
  bikeId: string;
  bikeName: string;
  apply: boolean;
  rideCount: number;
  totalRideMiles: number;
  checkedComponentCount: number;
  changedComponentCount: number;
  items: MileageRecalculationItem[];
  auditEventId?: string;
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
        const initialMileageInput = formData.get("initialMileage");
        const initialMileage =
          typeof initialMileageInput === "string" && initialMileageInput.length > 0
            ? Number(initialMileageInput)
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
              initialMileage,
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
          Mileage at install
          <input
            name="initialMileage"
            type="number"
            min="0"
            step="0.1"
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
          const initialMileageInput = formData.get("initialMileage");
          const initialMileage =
            typeof initialMileageInput === "string" && initialMileageInput.length > 0
              ? Number(initialMileageInput)
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
                initialMileage,
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
            Mileage at install
            <input
              name="initialMileage"
              type="number"
              min="0"
              step="0.1"
              defaultValue={component.initialMileage}
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
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [status, setStatus] = useState<FormStatus>({ type: "idle" });
  const [recalcStatus, setRecalcStatus] = useState<FormStatus>({ type: "idle" });
  const [recalcResult, setRecalcResult] = useState<MileageRecalculationResult | undefined>(
    undefined,
  );
  const [isRecalcBusy, setIsRecalcBusy] = useState(false);
  const [showRecalcInfo, setShowRecalcInfo] = useState(false);

  const driftItems = recalcResult?.items.filter((item) => item.willChange) ?? [];

  async function runRecalculation(apply: boolean) {
    if (disabled) {
      setRecalcStatus({
        type: "error",
        message: "Seed a bike first to run mileage recalculation.",
      });
      return;
    }

    if (!bikeId) {
      setRecalcStatus({
        type: "error",
        message: "No bike found to recalculate.",
      });
      return;
    }

    setIsRecalcBusy(true);
    setRecalcStatus({ type: "idle" });

    try {
      const response = await fetch("/api/components/recalculate-mileage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bikeId,
          apply,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        result?: MileageRecalculationResult;
      };

      if (!response.ok || !payload.result) {
        throw new Error(payload.error ?? "Could not recalculate mileage right now.");
      }

      setRecalcResult(payload.result);
      setShowRecalcInfo(false);

      if (apply) {
        setStatus({
          type: "success",
          message: `Mileage recalculation applied. Updated ${payload.result.changedComponentCount} component(s).`,
        });
        setRecalcStatus({
          type: "success",
          message: "Mileage recalculation applied and logged to maintenance history.",
        });
        setRecalcResult(undefined);
        setShowRecalcInfo(false);
        router.refresh();
      } else {
        setRecalcStatus({
          type: "success",
          message: `Preview ready. ${payload.result.changedComponentCount} component(s) have drift.`,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not recalculate mileage right now.";
      setRecalcStatus({ type: "error", message });
    } finally {
      setIsRecalcBusy(false);
    }
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-orange-950">Active components</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={disabled || isRecalcBusy}
            onClick={() => {
              runRecalculation(false);
            }}
            className="rounded-full border border-orange-300 px-4 py-2 text-sm font-semibold text-orange-900 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRecalcBusy ? "Working..." : "Preview recalc"}
          </button>
          <button
            type="button"
            disabled={disabled || isRecalcBusy || !recalcResult || driftItems.length === 0}
            onClick={() => {
              const shouldApply = window.confirm(
                "Apply mileage recalculation from rides? This will overwrite current mileage on drifted components.",
              );
              if (!shouldApply) {
                return;
              }

              runRecalculation(true);
            }}
            className="rounded-full border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRecalcBusy ? "Working..." : "Apply recalc"}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              const nextShowAddForm = !showAddForm;
              setShowAddForm(nextShowAddForm);
              if (nextShowAddForm) {
                setRecalcResult(undefined);
                setRecalcStatus({ type: "idle" });
                setShowRecalcInfo(false);
              }
              setStatus({ type: "idle" });
            }}
            className="rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {showAddForm ? "Close" : "Add component"}
          </button>
        </div>
      </div>

      {recalcStatus.type === "success" && recalcStatus.message ? (
        <p className="mb-4 rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {recalcStatus.message}
        </p>
      ) : null}

      {recalcStatus.type === "error" && recalcStatus.message ? (
        <p className="mb-4 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-800">
          {recalcStatus.message}
        </p>
      ) : null}

      {recalcResult ? (
        <div className="mb-4 rounded-3xl border border-orange-200 bg-white p-4 shadow-warm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-lg font-semibold text-orange-950">
              Mileage recalculation preview
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRecalcInfo((previous) => !previous)}
                className="h-7 w-7 rounded-full border border-orange-300 text-sm font-semibold text-orange-900 hover:bg-orange-100"
                aria-label="What does mileage recalculation do?"
                title="What does mileage recalculation do?"
              >
                i
              </button>
              <button
                type="button"
                onClick={() => {
                  setRecalcResult(undefined);
                  setShowRecalcInfo(false);
                  setRecalcStatus({ type: "idle" });
                }}
                className="h-7 w-7 rounded-full border border-orange-300 text-sm font-semibold text-orange-900 hover:bg-orange-100"
                aria-label="Close preview"
                title="Close preview"
              >
                X
              </button>
            </div>
          </div>

          {showRecalcInfo ? (
            <p className="mt-2 rounded-2xl border border-orange-100 bg-orange-50/70 px-3 py-2 text-xs text-orange-900/80">
              Recalc compares each active mileage-based component against expected mileage from your
              rides. Expected mileage is calculated as mileage at install + rides since install date
              (or all rides if install date is missing). Preview shows drift only; apply writes updates
              and logs an audit maintenance event.
            </p>
          ) : null}

          <p className="mt-1 text-sm text-orange-900/75">
            Rides: {recalcResult.rideCount} · Total miles: {recalcResult.totalRideMiles.toFixed(1)} ·
            Drifted components: {recalcResult.changedComponentCount}/{recalcResult.checkedComponentCount}
          </p>

          {driftItems.length === 0 ? (
            <p className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              No mileage drift detected.
            </p>
          ) : (
            <div className="mt-3 grid gap-2 lg:grid-cols-2">
              {driftItems.map((item) => (
                <article
                  key={item.componentId}
                  className="rounded-2xl border border-orange-100 bg-orange-50/70 px-3 py-2 text-sm text-orange-900"
                >
                  <p className="font-semibold">{item.componentName}</p>
                  <p className="text-xs text-orange-900/70">{formatComponentType(item.componentType)}</p>
                  <p className="mt-1">
                    {item.currentMileage.toFixed(1)} mi → {item.expectedMileage.toFixed(1)} mi
                  </p>
                  <p className="text-xs text-orange-900/70">
                    Drift: {item.deltaMileage > 0 ? "+" : ""}
                    {item.deltaMileage.toFixed(1)} mi · Rides used: {item.ridesUsed}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}

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
