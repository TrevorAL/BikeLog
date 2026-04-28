import type { DueItem } from "@/lib/maintenance";
import { StatusBadge } from "@/components/ui/StatusBadge";

type DueSoonListProps = {
  title: string;
  items: DueItem[];
};

export function DueSoonList({ title, items }: DueSoonListProps) {
  return (
    <section className="rounded-3xl border border-orange-200 bg-white p-5 shadow-warm">
      <h3 className="font-display text-xl font-semibold text-orange-950">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Nothing pending.</p>
        ) : (
          items.map((item) => (
            <article
              key={item.key}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-orange-50/70 px-3 py-2"
            >
              <div>
                <p className="text-sm font-semibold text-orange-950">{item.label}</p>
                <p className="text-xs text-orange-900/70">{item.detail}</p>
              </div>
              <StatusBadge status={item.status} />
            </article>
          ))
        )}
      </div>
    </section>
  );
}
