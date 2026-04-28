"use client";

import type { DueItem } from "@/lib/maintenance";
import { StatusBadge } from "@/components/ui/StatusBadge";

type DueSoonActionListProps = {
  title: string;
  items: DueItem[];
  isBusy?: boolean;
  onPrefill: (item: DueItem) => void;
  onMarkComplete: (item: DueItem) => void;
  canActOnItem: (item: DueItem) => boolean;
};

export function DueSoonActionList({
  title,
  items,
  isBusy = false,
  onPrefill,
  onMarkComplete,
  canActOnItem,
}: DueSoonActionListProps) {
  return (
    <section className="rounded-3xl border border-orange-200 bg-white p-5 shadow-warm">
      <h3 className="font-display text-xl font-semibold text-orange-950">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Nothing pending.</p>
        ) : (
          items.map((item) => {
            const canAct = canActOnItem(item);

            return (
              <article
                key={item.key}
                className="rounded-2xl border border-orange-100 bg-orange-50/70 px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-orange-950">{item.label}</p>
                    <p className="text-xs text-orange-900/70">{item.detail}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>

                {canAct ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onPrefill(item)}
                      className="rounded-full border border-orange-300 px-3 py-1.5 text-xs font-semibold text-orange-900 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Prefill form
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onMarkComplete(item)}
                      className="rounded-full border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
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

