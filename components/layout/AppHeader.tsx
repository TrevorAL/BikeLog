"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_LINKS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type AppHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function AppHeader({
  title,
  description,
  actions,
}: AppHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-orange-200/80 bg-orange-50/90 backdrop-blur">
      <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-display text-xs uppercase tracking-[0.22em] text-orange-700">
              BikeLog
            </p>
            <h1 className="font-display text-2xl font-bold text-orange-950">{title}</h1>
            {description ? (
              <p className="text-sm text-orange-900/70">{description}</p>
            ) : null}
          </div>
          <div className="hidden items-center gap-2 md:flex">{actions}</div>
        </div>

        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 md:hidden">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition",
                  active
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "border-orange-200 bg-white text-orange-900 hover:border-orange-400 hover:bg-orange-100",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
