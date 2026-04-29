"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bike,
  ClipboardList,
  Gauge,
  LayoutDashboard,
  ListChecks,
  Map,
  Ruler,
  UserRound,
  Wrench,
} from "lucide-react";

import { NAV_LINKS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const iconMap = {
  Dashboard: LayoutDashboard,
  Profile: UserRound,
  Bike,
  Components: Wrench,
  Rides: Map,
  Maintenance: ClipboardList,
  Pressure: Gauge,
  Fit: Ruler,
  Checklist: ListChecks,
} as const;

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 md:block">
      <div className="sticky top-[6.5rem] rounded-3xl border border-orange-200 bg-white/95 p-3 shadow-warm">
        <p className="px-3 pb-2 text-xs font-semibold tracking-wide text-orange-700 uppercase">
          Navigation
        </p>
        <ul className="space-y-1">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            const Icon = iconMap[link.label as keyof typeof iconMap] ?? LayoutDashboard;

            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-orange-500 text-white"
                      : "text-orange-900 hover:bg-orange-100",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
