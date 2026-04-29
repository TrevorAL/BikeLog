import type { ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type MobileGarageMenuItem = {
  href: string;
  title: string;
  icon: ReactNode;
};

type MobileGarageMenuProps = {
  items: MobileGarageMenuItem[];
};

export function MobileGarageMenu({ items }: MobileGarageMenuProps) {
  return (
    <nav className="mt-4 md:hidden">
      <p className="mb-2 text-xs font-semibold tracking-wide text-slate-700 uppercase">Quick navigation</p>
      <ul className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700",
                "hover:border-slate-400 hover:bg-slate-100",
              )}
            >
              <span className="text-slate-600">{item.icon}</span>
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
