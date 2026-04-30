import Link from "next/link";
import { ChevronDown } from "lucide-react";

type QuickActionItem = {
  href: string;
  label: string;
};

type QuickActionsDropdownProps = {
  items: QuickActionItem[];
  label?: string;
};

export function QuickActionsDropdown({
  items,
  label = "Quick actions",
}: QuickActionsDropdownProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <details className="group relative">
      <summary className="flex list-none cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 [&::-webkit-details-marker]:hidden">
        {label}
        <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 z-40 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={`${item.href}-${item.label}`}>
              <Link
                href={item.href}
                className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
