"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { BikeSwitcher } from "@/components/layout/BikeSwitcher";
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
  userImage?: string | null;
  bikes?: AppHeaderBike[];
  selectedBikeId?: string;
};

export function AppHeader({
  title,
  description,
  actions,
  userName,
  userEmail,
  userImage,
  bikes = [],
  selectedBikeId,
}: AppHeaderProps) {
  const pathname = usePathname();
  const primaryNavLinks = NAV_LINKS.filter((link) => link.href !== "/profile");
  const profileInitial = (userName?.trim()?.charAt(0) ?? userEmail?.charAt(0) ?? "P").toUpperCase();
  const profileImageUrl = userImage?.trim() ? userImage.trim() : null;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="h-0.5 w-full bg-gradient-to-r from-sky-600 via-slate-200 to-orange-500" />
      <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="relative h-8 w-8 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                <Image
                  src="/icons/app-icon.png"
                  alt="BikeLog"
                  fill
                  sizes="32px"
                  className="object-cover"
                  priority
                />
              </span>
              <span className="font-display text-lg font-semibold text-slate-900">
                Bike<span className="text-sky-700">Log</span>
              </span>
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
                        ? "bg-sky-700 text-white"
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
                  "flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border text-sm font-semibold transition",
                  pathname === "/profile"
                    ? "border-sky-700 ring-2 ring-sky-200"
                    : "border-slate-300 hover:border-slate-400 hover:bg-slate-100",
                )}
                aria-label="Profile"
                title="Profile"
              >
                {profileImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profileImageUrl}
                    alt={userName?.trim().length ? `${userName.trim()} profile` : "Profile"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-slate-700">{profileInitial}</span>
                )}
              </Link>
            ) : null}
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
                    ? "border-sky-700 bg-sky-700 text-white"
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
              <h1 className="font-display text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                {title}
              </h1>
              {description ? <p className="text-sm text-slate-600">{description}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
