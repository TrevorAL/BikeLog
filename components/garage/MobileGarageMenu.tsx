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
      <p className="mb-2 text-xs font-semibold tracking-wide text-orange-800 uppercase">Quick navigation</p>
      <ul className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-2xl border border-orange-200 bg-white px-3 py-2 text-sm font-semibold text-orange-900",
                "hover:border-orange-400 hover:bg-orange-100",
              )}
            >
              <span className="text-orange-700">{item.icon}</span>
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
