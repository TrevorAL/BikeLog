"use client";

import type { DueItem } from "@/lib/maintenance";
import { StatusBadge } from "@/components/ui/StatusBadge";

type DueSoonActionListProps = {
  title: string;
  items: DueItem[];
  activeDueKey?: string;
  isBusy?: boolean;
  onPrefill: (item: DueItem) => void;
  onMarkComplete: (item: DueItem) => void;
  canActOnItem: (item: DueItem) => boolean;
};

export function DueSoonActionList({
  title,
  items,
  activeDueKey,
  isBusy = false,
  onPrefill,
  onMarkComplete,
  canActOnItem,
}: DueSoonActionListProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-display text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
      <div className="mt-4 space-y-2">
        {items.length === 0 ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Nothing pending.</p>
        ) : (
          items.map((item) => {
            const canAct = canActOnItem(item);

            return (
              <article
                id={`due-item-${item.key}`}
                key={item.key}
                className={`rounded-lg border bg-slate-50 px-3 py-2 ${
                  activeDueKey === item.key
                    ? "border-slate-400 ring-2 ring-slate-200"
                    : "border-slate-100"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className="text-xs text-slate-600">{item.detail}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>

                {canAct ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onPrefill(item)}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Prefill form
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onMarkComplete(item)}
                      className="rounded-md border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isBusy ? "Working..." : "Mark complete"}
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
