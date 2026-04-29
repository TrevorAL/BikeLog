import Link from "next/link";

import type { DueItem } from "@/lib/maintenance";
import { StatusBadge } from "@/components/ui/StatusBadge";

type DueSoonListProps = {
  title: string;
  items: DueItem[];
  itemHrefBasePath?: string;
};

export function DueSoonList({ title, items, itemHrefBasePath }: DueSoonListProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-display text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
      <div className="mt-4 space-y-2">
        {items.length === 0 ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Nothing pending.</p>
        ) : (
          items.map((item) => {
            const content = (
              <article className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-600">{item.detail}</p>
                </div>
                <StatusBadge status={item.status} />
              </article>
            );

            if (!itemHrefBasePath) {
              return (
                <div
                  key={item.key}
                  className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  {content}
                </div>
              );
            }

            return (
              <Link
                key={item.key}
                href={`${itemHrefBasePath}?due=${encodeURIComponent(item.key)}`}
                className="block rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 hover:bg-slate-100"
              >
                {content}
              </Link>
            );
          })
        )}
      </div>
    </section>
  );
}
