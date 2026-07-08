"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bike,
  LayoutDashboard,
  Route,
  Ruler,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type TabItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  activePaths: string[];
};

const TABS: TabItem[] = [
  {
    href: "/dashboard",
    label: "Home",
    icon: LayoutDashboard,
    activePaths: ["/dashboard"],
  },
  {
    href: "/bike",
    label: "Garage",
    icon: Bike,
    activePaths: ["/bike", "/components", "/maintenance", "/checklist"],
  },
  {
    href: "/rides",
    label: "Rides",
    icon: Route,
    activePaths: ["/rides", "/pressure"],
  },
  {
    href: "/fit/bike",
    label: "Fit",
    icon: Ruler,
    activePaths: ["/fit"],
  },
  {
    href: "/profile",
    label: "Profile",
    icon: UserRound,
    activePaths: ["/profile", "/settings"],
  },
];

function isTabActive(tab: TabItem, pathname: string) {
  return tab.activePaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="app-header-surface fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto flex w-full max-w-md items-stretch">
        {TABS.map((tab) => {
          const active = isTabActive(tab, pathname);
          const Icon = tab.icon;

          return (
            <li key={tab.href} className="relative flex-1">
              {active ? (
                <span
                  aria-hidden
                  className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-brand-400"
                />
              ) : null}
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 pb-1.5 pt-2 transition-colors",
                  active
                    ? "text-brand-400"
                    : "text-slate-400 hover:text-slate-200",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 2} />
                <span className="text-[10px] font-semibold leading-none tracking-wide">
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
