import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-3xl border border-dashed border-orange-300 bg-orange-50/70 px-6 py-10 text-center">
      <h3 className="font-display text-xl font-semibold text-orange-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-orange-900/75">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
