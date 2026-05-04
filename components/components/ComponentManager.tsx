"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ComponentCard } from "@/components/components/ComponentCard";
import { COMPONENT_TYPES, DEFAULT_COMPONENT_NAME_BY_TYPE, formatComponentType } from "@/lib/component-options";
import {
  DEFAULT_COMPONENT_REPLACEMENT_INTERVAL_MILES,
  type MaintenanceStatus,
} from "@/lib/constants";

type ComponentListItem = {
  id: string;
  type: string;
  name: string;
  brand: string | null;
  model: string | null;
  installDate: string | null;
  initialMileage: number;
  currentMileage: number;
  replacementIntervalMiles: number | null;
  notes: string | null;
  conditionStatus: MaintenanceStatus;
  nextMaintenance: string;
};

type ComponentManagerProps = {
  bikeId?: string;
  components: ComponentListItem[];
  disabled?: boolean;
  initialShowAddForm?: boolean;
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

type RingTone = "sky" | "orange" | "emerald";

type RingMetric = {
  percent: number;
  label: string;
  detail: string;
  progress?: string;
  tone: RingTone;
};

const INSPECTION_INTERVAL_MILES_BY_LABEL: Record<string, number> = {
  "Chain lube": 120,
  "Chain wear check": 500,
  "Tire inspection": 400,
  "Brake pad inspection": 600,
  "Cleat inspection": 900,
  "Bar tape inspection": 1800,
  "Cassette inspection": 2000,
  "Rotor inspection": 1500,
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

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10;
}

function formatMiles(value: number) {
  const rounded = roundToTenth(value);
  if (Number.isInteger(rounded)) {
    return `${rounded.toFixed(0)}`;
  }

  return rounded.toFixed(1);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function parseNextMaintenance(nextMaintenance: string) {
  const separatorIndex = nextMaintenance.indexOf(":");
  if (separatorIndex < 0) {
    return {
      label: "",
      detail: nextMaintenance.trim(),
    };
  }

  return {
    label: nextMaintenance.slice(0, separatorIndex).trim(),
    detail: nextMaintenance.slice(separatorIndex + 1).trim(),
  };
}

function getPercentFromMileageDetail(detail: string, intervalMiles: number) {
  if (detail.toLowerCase() === "due now") {
    return 100;
  }

  const remainingMatch = detail.match(/^([0-9]+(?:\.[0-9]+)?) miles remaining$/i);
  if (remainingMatch) {
    const milesRemaining = Number(remainingMatch[1]);
    return clampPercent(((intervalMiles - milesRemaining) / intervalMiles) * 100);
  }

  const overdueMatch = detail.match(/^([0-9]+(?:\.[0-9]+)?) miles overdue$/i);
  if (overdueMatch) {
    return 100;
  }

  return undefined;
}

function getInspectionMetric(component: ComponentListItem): RingMetric {
  const { label, detail } = parseNextMaintenance(component.nextMaintenance);
  const intervalMiles = INSPECTION_INTERVAL_MILES_BY_LABEL[label];
  const parsedPercent = intervalMiles
    ? getPercentFromMileageDetail(detail, intervalMiles)
    : undefined;

  if (typeof parsedPercent === "number") {
    return {
      percent: parsedPercent,
      label: "Inspection",
      detail,
      tone:
        component.conditionStatus === "DUE_NOW" || component.conditionStatus === "OVERDUE"
          ? "orange"
          : component.conditionStatus === "DUE_SOON"
            ? "sky"
            : "emerald",
    };
  }

  if (detail.toLowerCase() === "no immediate action") {
    return {
      percent: 0,
      label: "Inspection",
      detail: "No pending inspection",
      tone: "emerald",
    };
  }

  const fallbackPercentByStatus: Record<MaintenanceStatus, number> = {
    GOOD: 25,
    DUE_SOON: 75,
    DUE_NOW: 100,
    OVERDUE: 100,
  };

  return {
    percent: fallbackPercentByStatus[component.conditionStatus],
    label: "Inspection",
    detail: detail || "No inspection data",
    tone:
      component.conditionStatus === "DUE_NOW" || component.conditionStatus === "OVERDUE"
        ? "orange"
        : component.conditionStatus === "DUE_SOON"
          ? "sky"
          : "emerald",
  };
}

function getReplacementMetric(component: ComponentListItem): RingMetric {
  const replacementInterval =
    component.replacementIntervalMiles ??
    DEFAULT_COMPONENT_REPLACEMENT_INTERVAL_MILES[component.type];
  if (!replacementInterval) {
    return {
      percent: 0,
      label: "Replacement",
      detail: "Replacement interval not set",
      tone: "sky",
    };
  }

  const milesOnComponent = Math.max(0, component.currentMileage - component.initialMileage);
  const milesRemaining = replacementInterval - milesOnComponent;
  const percent = clampPercent((milesOnComponent / replacementInterval) * 100);
  const progress = `${formatMiles(milesOnComponent)} / ${formatMiles(replacementInterval)} mi`;

  if (milesRemaining <= 0) {
    return {
      percent: 100,
      label: "Replacement",
      detail: `${Math.abs(Math.round(milesRemaining))} miles overdue`,
      progress,
      tone: "orange",
    };
  }

  return {
    percent,
    label: "Replacement",
    detail: `${Math.round(milesRemaining)} miles remaining`,
    progress,
    tone: milesRemaining <= replacementInterval * 0.2 ? "sky" : "emerald",
  };
}

function getRingToneClasses(tone: RingTone) {
  if (tone === "orange") {
    return {
      text: "text-orange-700",
      progress: "stroke-orange-500",
      track: "stroke-orange-100",
    };
  }

  if (tone === "sky") {
    return {
      text: "text-sky-700",
      progress: "stroke-sky-500",
      track: "stroke-sky-100",
    };
  }

  return {
    text: "text-emerald-700",
    progress: "stroke-emerald-500",
    track: "stroke-emerald-100",
  };
}

function MetricRing({ metric }: { metric: RingMetric }) {
  const size = 76;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clampPercent(metric.percent) / 100);
  const toneClasses = getRingToneClasses(metric.tone);

  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-3">
        <div className="relative h-[76px] w-[76px] shrink-0">
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="h-full w-full -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={strokeWidth}
              className={toneClasses.track}
              fill="none"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={strokeWidth}
              className={toneClasses.progress}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <span
            className={`absolute inset-0 flex items-center justify-center text-xs font-semibold ${toneClasses.text}`}
          >
            {Math.round(clampPercent(metric.percent))}%
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{metric.label}</p>
          <p className="text-xs text-slate-600">{metric.detail}</p>
          {metric.progress ? (
            <p className="mt-0.5 text-xs text-slate-500">{metric.progress}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
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
      className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
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
        const replacementIntervalInput = formData.get("replacementIntervalMiles");
        const replacementIntervalMiles =
          typeof replacementIntervalInput === "string" && replacementIntervalInput.length > 0
            ? Number(replacementIntervalInput)
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
              replacementIntervalMiles,
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
      <h3 className="font-display text-lg font-semibold text-slate-900">Add component</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-slate-700">
          Type
          <select
            name="type"
            value={selectedType}
            onChange={(event) =>
              setSelectedType(event.target.value as (typeof COMPONENT_TYPES)[number])
            }
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
          >
            {COMPONENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {formatComponentType(type)}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-700">
          Name
          <input
            name="name"
            type="text"
            placeholder={DEFAULT_COMPONENT_NAME_BY_TYPE[selectedType]}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>

        <label className="text-sm text-slate-700">
          Brand
          <input name="brand" type="text" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
        </label>

        <label className="text-sm text-slate-700">
          Model
          <input name="model" type="text" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
        </label>

        <label className="text-sm text-slate-700">
          Install date
          <input
            name="installDate"
            type="date"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>

        <label className="text-sm text-slate-700">
          Mileage at install
          <input
            name="initialMileage"
            type="number"
            min="0"
            step="0.1"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>

        <label className="text-sm text-slate-700">
          Current mileage
          <input
            name="currentMileage"
            type="number"
            min="0"
            step="0.1"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>

        <label className="text-sm text-slate-700">
          Replacement life (miles)
          <input
            name="replacementIntervalMiles"
            type="number"
            min="1"
            step="1"
            placeholder={`${DEFAULT_COMPONENT_REPLACEMENT_INTERVAL_MILES[selectedType]} (default)`}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>
      </div>

      <label className="mt-3 block text-sm text-slate-700">
        Notes
        <textarea name="notes" className="mt-1 h-20 w-full rounded-xl border border-slate-200 px-3 py-2" />
      </label>

      <button
        type="submit"
        disabled={isSubmitting || disabled}
        className="mt-4 rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Saving..." : "Add component"}
      </button>

      {status.type === "error" && status.message ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{status.message}</p>
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
  const [showDetails, setShowDetails] = useState(false);
  const replacementIntervalMiles =
    component.replacementIntervalMiles ??
    DEFAULT_COMPONENT_REPLACEMENT_INTERVAL_MILES[component.type] ??
    0;
  const milesOnComponent = Math.max(0, component.currentMileage - component.initialMileage);
  const replacementProgressText = replacementIntervalMiles
    ? `${formatMiles(milesOnComponent)} / ${formatMiles(replacementIntervalMiles)} mi`
    : undefined;
  const inspectionMetric = getInspectionMetric(component);
  const replacementMetric = getReplacementMetric(component);
  const installedOn = toDateInputValue(component.installDate);

  useEffect(() => {
    if (!showDetails) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowDetails(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showDetails]);

  if (mode === "edit") {
    return (
      <form
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        onSubmit={async (event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const currentMileageInput = formData.get("currentMileage");
          const currentMileage =
            typeof currentMileageInput === "string" && currentMileageInput.length > 0
              ? roundToTenth(Number(currentMileageInput))
              : undefined;
          const initialMileageInput = formData.get("initialMileage");
          const initialMileage =
            typeof initialMileageInput === "string" && initialMileageInput.length > 0
              ? Number(initialMileageInput)
              : undefined;
          const replacementIntervalInput = formData.get("replacementIntervalMiles");
          const replacementIntervalMiles =
            typeof replacementIntervalInput === "string"
              ? replacementIntervalInput.length > 0
                ? Number(replacementIntervalInput)
                : null
              : null;

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
                replacementIntervalMiles,
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
          <h3 className="font-display text-lg font-semibold text-slate-900">Edit component</h3>
          <button
            type="button"
            onClick={() => {
              setMode("view");
              setStatus({ type: "idle" });
            }}
            className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-slate-700">
            Name
            <input
              name="name"
              type="text"
              required
              defaultValue={component.name}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>

          <label className="text-sm text-slate-700">
            Type
            <input
              type="text"
              value={formatComponentType(component.type)}
              readOnly
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            />
          </label>

          <label className="text-sm text-slate-700">
            Brand
            <input
              name="brand"
              type="text"
              defaultValue={component.brand ?? ""}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>

          <label className="text-sm text-slate-700">
            Model
            <input
              name="model"
              type="text"
              defaultValue={component.model ?? ""}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>

          <label className="text-sm text-slate-700">
            Install date
            <input
              name="installDate"
              type="date"
              defaultValue={toDateInputValue(component.installDate)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>

          <label className="text-sm text-slate-700">
            Mileage at install
            <input
              name="initialMileage"
              type="number"
              min="0"
              step="0.1"
              defaultValue={component.initialMileage}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>

          <label className="text-sm text-slate-700">
            Current mileage
            <input
              name="currentMileage"
              type="number"
              min="0"
              step="0.1"
              defaultValue={roundToTenth(component.currentMileage)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>

          <label className="text-sm text-slate-700">
            Replacement life (miles)
            <input
              name="replacementIntervalMiles"
              type="number"
              min="1"
              step="1"
              defaultValue={component.replacementIntervalMiles ?? ""}
              placeholder={`${DEFAULT_COMPONENT_REPLACEMENT_INTERVAL_MILES[component.type]} (default)`}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
        </div>

        <label className="mt-3 block text-sm text-slate-700">
          Notes
          <textarea
            name="notes"
            defaultValue={component.notes ?? ""}
            className="mt-1 h-20 w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting || disabled}
          className="mt-4 rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : "Save changes"}
        </button>

        {status.type === "error" && status.message ? (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{status.message}</p>
        ) : null}
      </form>
    );
  }

  if (mode === "replace") {
    return (
      <form
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        onSubmit={async (event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const replacementIntervalInput = formData.get("replacementIntervalMiles");
          const replacementIntervalMiles =
            typeof replacementIntervalInput === "string" &&
            replacementIntervalInput.length > 0
              ? Number(replacementIntervalInput)
              : undefined;

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
                replacementIntervalMiles,
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
          <h3 className="font-display text-lg font-semibold text-slate-900">Replace component</h3>
          <button
            type="button"
            onClick={() => {
              setMode("view");
              setStatus({ type: "idle" });
            }}
            className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          The current component will be marked replaced, and a new active one will start at 0 miles.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-slate-700">
            New name
            <input
              name="name"
              type="text"
              defaultValue={component.name}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-700">
            New brand
            <input
              name="brand"
              type="text"
              defaultValue={component.brand ?? ""}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-700">
            New model
            <input
              name="model"
              type="text"
              defaultValue={component.model ?? ""}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-700">
            Install date
            <input
              name="installDate"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-700">
            Replacement life (miles)
            <input
              name="replacementIntervalMiles"
              type="number"
              min="1"
              step="1"
              defaultValue={component.replacementIntervalMiles ?? ""}
              placeholder={`${DEFAULT_COMPONENT_REPLACEMENT_INTERVAL_MILES[component.type]} (default)`}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
        </div>

        <label className="mt-3 block text-sm text-slate-700">
          Notes
          <textarea
            name="notes"
            defaultValue={component.notes ?? ""}
            className="mt-1 h-20 w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting || disabled}
          className="mt-4 rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Replacing..." : "Confirm replace"}
        </button>

        {status.type === "error" && status.message ? (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{status.message}</p>
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
        mileageProgress={replacementProgressText}
        installDate={component.installDate ? new Date(component.installDate) : null}
        conditionStatus={component.conditionStatus}
        nextMaintenance={component.nextMaintenance}
        onClick={() => {
          setShowDetails(true);
        }}
        actions={
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setMode("edit");
                setStatus({ type: "idle" });
              }}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
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
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Replace
            </button>
          </div>
        }
      />

      {showDetails ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
          onClick={() => setShowDetails(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`component-details-title-${component.id}`}
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3
                  id={`component-details-title-${component.id}`}
                  className="font-display text-lg font-semibold text-slate-900"
                >
                  {component.name}
                </h3>
                <p className="text-sm text-slate-600">{formatComponentType(component.type)}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Brand / model</p>
                <p className="font-medium text-slate-900">
                  {`${component.brand ?? ""} ${component.model ?? ""}`.trim() || "Not set"}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Installed on</p>
                <p className="font-medium text-slate-900">{installedOn || "Not set"}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Mileage at install</p>
                <p className="font-medium text-slate-900">{roundToTenth(component.initialMileage)} mi</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-500">Current mileage</p>
                <p className="font-medium text-slate-900">{roundToTenth(component.currentMileage)} mi</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2 sm:col-span-2">
                <p className="text-xs text-slate-500">Life progress</p>
                <p className="font-medium text-slate-900">
                  {replacementProgressText ?? "Replacement interval not set"}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MetricRing
                metric={{
                  ...inspectionMetric,
                  label: "Next inspection",
                }}
              />
              <MetricRing metric={replacementMetric} />
            </div>

            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">Next maintenance</p>
              <p className="text-sm font-medium text-slate-900">{component.nextMaintenance}</p>
            </div>

            {component.notes ? (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-xs text-slate-500">Notes</p>
                <p className="text-sm text-slate-700">{component.notes}</p>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {status.type === "error" && status.message ? (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{status.message}</p>
      ) : null}
    </div>
  );
}

export function ComponentManager({
  bikeId,
  components,
  disabled = false,
  initialShowAddForm = false,
}: ComponentManagerProps) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(initialShowAddForm);
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
        <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900">Active components</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={disabled || isRecalcBusy}
            onClick={() => {
              runRecalculation(false);
            }}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
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
            className="rounded-md border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
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
            className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {showAddForm ? "Close" : "Add component"}
          </button>
        </div>
      </div>

      {recalcStatus.type === "success" && recalcStatus.message ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {recalcStatus.message}
        </p>
      ) : null}

      {recalcStatus.type === "error" && recalcStatus.message ? (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {recalcStatus.message}
        </p>
      ) : null}

      {recalcResult ? (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-lg font-semibold text-slate-900">
              Mileage recalculation preview
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRecalcInfo((previous) => !previous)}
                className="h-7 w-7 rounded-md border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100"
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
                className="h-7 w-7 rounded-md border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                aria-label="Close preview"
                title="Close preview"
              >
                X
              </button>
            </div>
          </div>

          {showRecalcInfo ? (
            <p className="mt-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Recalc compares each active mileage-based component against expected mileage from your
              rides. Expected mileage is calculated as mileage at install + rides since install date
              (or all rides if install date is missing). Preview shows drift only; apply writes updates
              and logs an audit maintenance event.
            </p>
          ) : null}

          <p className="mt-1 text-sm text-slate-600">
            Rides: {recalcResult.rideCount} · Total miles: {recalcResult.totalRideMiles.toFixed(1)} ·
            Drifted components: {recalcResult.changedComponentCount}/{recalcResult.checkedComponentCount}
          </p>

          {driftItems.length === 0 ? (
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              No mileage drift detected.
            </p>
          ) : (
            <div className="mt-3 grid gap-2 lg:grid-cols-2">
              {driftItems.map((item) => (
                <article
                  key={item.componentId}
                  className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                >
                  <p className="font-semibold">{item.componentName}</p>
                  <p className="text-xs text-slate-600">{formatComponentType(item.componentType)}</p>
                  <p className="mt-1">
                    {item.currentMileage.toFixed(1)} mi → {item.expectedMileage.toFixed(1)} mi
                  </p>
                  <p className="text-xs text-slate-600">
                    Drift: {item.deltaMileage > 0 ? "+" : ""}
                    {item.deltaMileage.toFixed(1)} mi · Rides used: {item.ridesUsed}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <section id="add-component-form" className="scroll-mt-40">
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
      </section>

      {status.type === "success" && status.message ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{status.message}</p>
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
