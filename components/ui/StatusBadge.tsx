import type { MaintenanceStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

type BadgeStatus = MaintenanceStatus | "ACTIVE" | "REPLACED" | "RETIRED";

const badgeClasses: Record<BadgeStatus, string> = {
  GOOD: "bg-emerald-100 text-emerald-800 border-emerald-200",
  DUE_SOON: "bg-amber-100 text-amber-800 border-amber-200",
  DUE_NOW: "bg-slate-100 text-slate-700 border-slate-200",
  OVERDUE: "bg-red-100 text-red-800 border-red-200",
  ACTIVE: "bg-slate-100 text-slate-800 border-slate-200",
  REPLACED: "bg-indigo-100 text-indigo-800 border-indigo-200",
  RETIRED: "bg-zinc-200 text-zinc-700 border-zinc-300",
};

type StatusBadgeProps = {
  status: BadgeStatus;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        badgeClasses[status],
        className,
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
