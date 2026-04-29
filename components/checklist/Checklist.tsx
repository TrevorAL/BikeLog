"use client";

import { useMemo, useState } from "react";

type ChecklistItem = {
  id: string;
  label: string;
  completed: boolean;
  isDefault: boolean;
};

type ChecklistProps = {
  bikeId?: string;
  initialItems: ChecklistItem[];
  disabled?: boolean;
};

type FormStatus = {
  type: "idle" | "success" | "error";
  message?: string;
};

export function Checklist({ bikeId, initialItems, disabled = false }: ChecklistProps) {
  const [items, setItems] = useState(initialItems);
  const [newItem, setNewItem] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<FormStatus>({ type: "idle" });

  const completedCount = useMemo(
    () => items.filter((item) => item.completed).length,
    [items],
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-semibold text-slate-900">Before-ride checklist</h3>
          <p className="text-sm text-slate-600">
            {completedCount}/{items.length} completed
          </p>
        </div>
        <button
          type="button"
          disabled={disabled || isSubmitting}
          onClick={async () => {
            setIsSubmitting(true);
            setStatus({ type: "idle" });

            try {
              const response = await fetch("/api/checklist-items/reset", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ bikeId }),
              });

              const payload = (await response.json()) as { error?: string };

              if (!response.ok) {
                throw new Error(payload.error ?? "Could not reset checklist.");
              }

              setItems((previous) =>
                previous.map((item) => ({
                  ...item,
                  completed: false,
                })),
              );

              setStatus({ type: "success", message: "Checklist reset." });
            } catch (error) {
              const message =
                error instanceof Error ? error.message : "Could not reset checklist right now.";
              setStatus({ type: "error", message });
            } finally {
              setIsSubmitting(false);
            }
          }}
          className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Working..." : "Reset"}
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <label
            key={item.id}
            className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
          >
            <input
              type="checkbox"
              checked={item.completed}
              disabled={disabled || isSubmitting}
              onChange={async (event) => {
                const nextCompleted = event.target.checked;

                setItems((previous) =>
                  previous.map((existing) =>
                    existing.id === item.id
                      ? { ...existing, completed: nextCompleted }
                      : existing,
                  ),
                );

                try {
                  const response = await fetch(`/api/checklist-items/${item.id}`, {
                    method: "PATCH",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      completed: nextCompleted,
                    }),
                  });

                  const payload = (await response.json()) as { error?: string };

                  if (!response.ok) {
                    throw new Error(payload.error ?? "Could not update checklist item.");
                  }
                } catch (error) {
                  setItems((previous) =>
                    previous.map((existing) =>
                      existing.id === item.id
                        ? { ...existing, completed: !nextCompleted }
                        : existing,
                    ),
                  );

                  const message =
                    error instanceof Error
                      ? error.message
                      : "Could not update checklist item right now.";
                  setStatus({ type: "error", message });
                }
              }}
              className="h-4 w-4 rounded border-slate-300 text-slate-600"
            />
            {item.label}
            <button
              type="button"
              disabled={disabled || isSubmitting}
              className="ml-auto rounded-full border border-red-300 px-2 py-0.5 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={async () => {
                setIsSubmitting(true);
                setStatus({ type: "idle" });

                try {
                  const response = await fetch(`/api/checklist-items/${item.id}`, {
                    method: "DELETE",
                  });

                  const payload = (await response.json()) as { error?: string };

                  if (!response.ok) {
                    throw new Error(payload.error ?? "Could not delete checklist item.");
                  }

                  setItems((previous) =>
                    previous.filter((existing) => existing.id !== item.id),
                  );
                  setStatus({ type: "success", message: "Checklist item deleted." });
                } catch (error) {
                  const message =
                    error instanceof Error
                      ? error.message
                      : "Could not delete checklist item right now.";
                  setStatus({ type: "error", message });
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              Delete
            </button>
          </label>
        ))}
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={async (event) => {
          event.preventDefault();

          if (disabled || isSubmitting) {
            return;
          }

          const label = newItem.trim();
          if (!label) {
            return;
          }

          setIsSubmitting(true);
          setStatus({ type: "idle" });

          try {
            const response = await fetch("/api/checklist-items", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                bikeId,
                label,
              }),
            });

            const payload = (await response.json()) as {
              error?: string;
              item?: ChecklistItem;
            };

            if (!response.ok || !payload.item) {
              throw new Error(payload.error ?? "Could not add checklist item.");
            }

            setItems((previous) => [...previous, payload.item as ChecklistItem]);
            setNewItem("");
            setStatus({ type: "success", message: "Checklist item added." });
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Could not add checklist item right now.";
            setStatus({ type: "error", message });
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <input
          type="text"
          value={newItem}
          onChange={(event) => setNewItem(event.target.value)}
          placeholder="Add custom checklist item"
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
          disabled={disabled || isSubmitting}
        />
        <button
          type="submit"
          disabled={disabled || isSubmitting}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : "Add"}
        </button>
      </form>

      {status.type === "success" && status.message ? (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {status.message}
        </p>
      ) : null}

      {status.type === "error" && status.message ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{status.message}</p>
      ) : null}
    </section>
  );
}
