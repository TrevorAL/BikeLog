"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BikeSwitcher } from "@/components/layout/BikeSwitcher";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { NAV_LINKS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type AppHeaderBike = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  year: number | null;
};

type AppHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  userName?: string | null;
  userEmail?: string | null;
  bikes?: AppHeaderBike[];
  selectedBikeId?: string;
};

export function AppHeader({
  title,
  description,
  actions,
  userName,
  userEmail,
  bikes = [],
  selectedBikeId,
}: AppHeaderProps) {
  const pathname = usePathname();
  const primaryNavLinks = NAV_LINKS.filter((link) => link.href !== "/profile");

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-6">
            <Link href="/dashboard" className="font-display text-lg font-semibold text-slate-900">
              BikeLog
            </Link>
            <nav className="hidden items-center gap-1 lg:flex">
              {primaryNavLinks.map((link) => {
                const active = pathname === link.href;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition",
                      active
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {userEmail && bikes.length > 0 ? (
              <BikeSwitcher bikes={bikes} selectedBikeId={selectedBikeId} />
            ) : null}
            {userEmail ? (
              <Link
                href="/profile"
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition",
                  pathname === "/profile"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                {userName?.trim().length ? userName.trim() : "Profile"}
              </Link>
            ) : null}
            {userEmail ? <SignOutButton /> : null}
          </div>
        </div>

        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition",
                  active
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-100",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-3 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-semibold text-slate-900">{title}</h1>
              {description ? <p className="text-sm text-slate-600">{description}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
