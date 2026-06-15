import type { ReactNode } from "react";

import { GearBadge } from "@/components/ui/illustrations/GearBadge";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center shadow-card",
        className,
      )}
    >
      <GearBadge className="h-12 w-12 text-brand-300" />
      <div>
        <h3 className="font-display text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">{description}</p>
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
