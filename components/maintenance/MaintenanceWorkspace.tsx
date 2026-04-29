"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { DueSoonActionList } from "@/components/maintenance/DueSoonActionList";
import { MaintenanceForm, type MaintenanceFormPrefill } from "@/components/maintenance/MaintenanceForm";
import { MaintenanceHistoryManager } from "@/components/maintenance/MaintenanceHistoryManager";
import { EmptyState } from "@/components/ui/EmptyState";
import { getDueActionConfig } from "@/lib/maintenance-actions";
import type { ConditionSuggestion, DueItem } from "@/lib/maintenance";

type MaintenanceWorkspaceComponent = {
  id: string;
  name: string;
  type: string;
  currentMileage: number;
};

type MaintenanceWorkspaceEvent = {
  id: string;
  date: string;
  type: string;
  mileageAtService: number | null;
  notes: string | null;
  componentId: string | null;
  componentName?: string;
};

type MaintenanceWorkspaceProps = {
  bikeId?: string;
  dueNowItems: DueItem[];
  dueSoonItems: DueItem[];
  suggestions: ConditionSuggestion[];
  initialDueKey?: string;
  components: MaintenanceWorkspaceComponent[];
  events: MaintenanceWorkspaceEvent[];
  disabled?: boolean;
};

type ActionStatus = {
  type: "idle" | "success" | "error";
  message?: string;
};

type PrefillInput = Omit<MaintenanceFormPrefill, "token">;

function todayDateInputValue() {
  const now = new Date();
  const timezoneOffsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

export function MaintenanceWorkspace({
  bikeId,
  dueNowItems,
  dueSoonItems,
  suggestions,
  initialDueKey,
  components,
  events,
  disabled = false,
}: MaintenanceWorkspaceProps) {
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);
  const [actionStatus, setActionStatus] = useState<ActionStatus>({ type: "idle" });
  const [prefill, setPrefill] = useState<MaintenanceFormPrefill | undefined>(undefined);
  const selectedDueItem = initialDueKey
    ? [...dueNowItems, ...dueSoonItems].find((item) => item.key === initialDueKey)
    : undefined;

  function applyPrefill(input: PrefillInput) {
    setPrefill((previous) => ({
      token: (previous?.token ?? 0) + 1,
      ...input,
    }));
  }

  function findComponentForDueKey(dueKey: string) {
    const actionConfig = getDueActionConfig(dueKey);
    if (!actionConfig) {
      return undefined;
    }

    for (const componentType of actionConfig.componentTypePriority) {
      const matchingComponent = components.find((component) => component.type === componentType);
      if (matchingComponent) {
        return matchingComponent;
      }
    }

    return undefined;
  }

  async function markComplete(item: DueItem) {
    if (disabled) {
      setActionStatus({
        type: "error",
        message: "Seed a bike first to enable maintenance logging.",
      });
      return;
    }

    if (!bikeId) {
      setActionStatus({
        type: "error",
        message: "No bike found. Seed the database first.",
      });
      return;
    }

    const actionConfig = getDueActionConfig(item.key);
    if (!actionConfig) {
      setActionStatus({
        type: "error",
        message: "This reminder does not have a quick-complete action yet.",
      });
      return;
    }

    const component = findComponentForDueKey(item.key);

    setIsCompleting(true);
    setActionStatus({ type: "idle" });

    try {
      const actionNotePrefix = actionConfig.noteTag ? `${actionConfig.noteTag} ` : "";
      const response = await fetch("/api/maintenance-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bikeId,
          date: todayDateInputValue(),
          type: actionConfig.eventType,
          componentId: component?.id,
          mileageSource: component ? "component" : "manual",
          notes: `${actionNotePrefix}Marked complete from due reminder: ${item.label}.`,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not mark maintenance complete.");
      }

      setActionStatus({
        type: "success",
        message: `${item.label} marked complete and logged in maintenance history.`,
      });
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not mark maintenance complete right now.";
      setActionStatus({ type: "error", message });
    } finally {
      setIsCompleting(false);
    }
  }

  function prefillFromDueItem(item: DueItem) {
    const actionConfig = getDueActionConfig(item.key);
    if (!actionConfig) {
      return;
    }

    const component = findComponentForDueKey(item.key);
    const notePrefix = actionConfig.noteTag ? `${actionConfig.noteTag} ` : "";

    applyPrefill({
      type: actionConfig.eventType,
      componentId: component?.id,
      mileageSource: component ? "component" : "manual",
      notes: `${notePrefix}From reminder: ${item.label}`,
    });

    const formElement = document.getElementById("maintenance-log-form");
    formElement?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function canActOnDueItem(item: DueItem) {
    return Boolean(getDueActionConfig(item.key));
  }

  function prefillFromConditionSuggestion(suggestion: ConditionSuggestion) {
    const actionConfig = getDueActionConfig(suggestion.dueActionKey);
    if (!actionConfig) {
      return;
    }

    const component = findComponentForDueKey(suggestion.dueActionKey);
    const notePrefix = actionConfig.noteTag ? `${actionConfig.noteTag} ` : "";

    applyPrefill({
      type: actionConfig.eventType,
      componentId: component?.id,
      mileageSource: component ? "component" : "manual",
      notes: `${notePrefix}From condition suggestion: ${suggestion.label}`,
    });

    setActionStatus({
      type: "success",
      message: `Prefilled maintenance form for: ${suggestion.label}`,
    });

    const formElement = document.getElementById("maintenance-log-form");
    formElement?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-2">
        <DueSoonActionList
          title="Due now / overdue"
          items={dueNowItems}
          activeDueKey={initialDueKey}
          isBusy={isCompleting}
          onPrefill={prefillFromDueItem}
          onMarkComplete={markComplete}
          canActOnItem={canActOnDueItem}
        />
        <DueSoonActionList
          title="Due soon"
          items={dueSoonItems}
          activeDueKey={initialDueKey}
          isBusy={isCompleting}
          onPrefill={prefillFromDueItem}
          onMarkComplete={markComplete}
          canActOnItem={canActOnDueItem}
        />
      </section>

      {actionStatus.type === "success" && actionStatus.message ? (
        <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {actionStatus.message}
        </p>
      ) : null}

      {actionStatus.type === "error" && actionStatus.message ? (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {actionStatus.message}
        </p>
      ) : null}

      {selectedDueItem ? (
        <p className="mt-4 rounded-2xl bg-orange-50 px-4 py-3 text-sm text-orange-900/85">
          Selected reminder from dashboard: <strong>{selectedDueItem.label}</strong>. Use
          &quot;Prefill form&quot; or &quot;Mark complete&quot; below.
        </p>
      ) : null}

      <section className="mt-6 rounded-3xl border border-orange-200 bg-white p-5 shadow-warm">
        <h2 className="font-display text-xl font-semibold text-orange-950">Condition-based suggestions</h2>
        {suggestions.length ? (
          <ul className="mt-3 space-y-2">
            {suggestions.map((suggestion) => (
              <li
                key={suggestion.key}
                className="rounded-2xl border border-orange-100 bg-orange-50/70 px-3 py-2 text-sm text-orange-900/80"
              >
                <button
                  type="button"
                  onClick={() => prefillFromConditionSuggestion(suggestion)}
                  className="w-full cursor-pointer text-left hover:text-orange-950"
                >
                  {suggestion.label}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-orange-900/70">No suggestions from recent ride conditions.</p>
        )}
      </section>

      <section id="maintenance-log-form" className="mt-6">
        <MaintenanceForm
          key={prefill?.token ?? 0}
          bikeId={bikeId}
          components={components}
          disabled={disabled}
          prefill={prefill}
        />
      </section>

      <section className="mt-6">
        <h2 className="font-display text-xl font-semibold text-orange-950">Maintenance history</h2>
        <div className="mt-3">
          {events.length > 0 ? (
            <MaintenanceHistoryManager
              events={events}
              components={components}
              disabled={disabled}
            />
          ) : (
            <EmptyState
              title="No maintenance events yet"
              description="Log your first maintenance event to start tracking service history."
            />
          )}
        </div>
      </section>
    </>
  );
}
