"use client";

import { useMemo, useState } from "react";

type ChecklistItem = {
  id: string;
  label: string;
  completed: boolean;
};

type ChecklistProps = {
  initialItems: ChecklistItem[];
};

export function Checklist({ initialItems }: ChecklistProps) {
  const [items, setItems] = useState(initialItems);
  const [newItem, setNewItem] = useState("");

  const completedCount = useMemo(
    () => items.filter((item) => item.completed).length,
    [items],
  );

  return (
    <section className="rounded-3xl border border-orange-200 bg-white p-5 shadow-warm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-semibold text-orange-950">Before-ride checklist</h3>
          <p className="text-sm text-orange-900/70">
            {completedCount}/{items.length} completed
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setItems((previous) => previous.map((item) => ({ ...item, completed: false })))
          }
          className="rounded-full border border-orange-300 px-3 py-1.5 text-xs font-semibold text-orange-900 hover:bg-orange-100"
        >
          Reset
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <label
            key={item.id}
            className="flex items-center gap-2 rounded-2xl border border-orange-100 bg-orange-50/60 px-3 py-2 text-sm"
          >
            <input
              type="checkbox"
              checked={item.completed}
              onChange={(event) =>
                setItems((previous) =>
                  previous.map((existing) =>
                    existing.id === item.id
                      ? { ...existing, completed: event.target.checked }
                      : existing,
                  ),
                )
              }
              className="h-4 w-4 rounded border-orange-300 text-orange-600"
            />
            {item.label}
            {!item.id.startsWith("check_") ? (
              <button
                type="button"
                className="ml-auto rounded-full border border-red-300 px-2 py-0.5 text-xs font-semibold text-red-700"
                onClick={() =>
                  setItems((previous) => previous.filter((existing) => existing.id !== item.id))
                }
              >
                Delete
              </button>
            ) : null}
          </label>
        ))}
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const label = newItem.trim();
          if (!label) {
            return;
          }
          setItems((previous) => [
            ...previous,
            { id: `custom_${Date.now()}`, label, completed: false },
          ]);
          setNewItem("");
        }}
      >
        <input
          type="text"
          value={newItem}
          onChange={(event) => setNewItem(event.target.value)}
          placeholder="Add custom checklist item"
          className="flex-1 rounded-xl border border-orange-200 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
        >
          Add
        </button>
      </form>
    </section>
  );
}
