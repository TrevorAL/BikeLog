"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

export type NavMenuItem = {
  href: string;
  label: string;
  description?: string;
};

export type NavMenuGroup = {
  key: string;
  label: string;
  activePaths: string[];
  items: NavMenuItem[];
};

function getPathFromHref(href: string) {
  return href.split("?")[0].split("#")[0];
}

export function isNavGroupActive(group: NavMenuGroup, pathname: string) {
  return group.activePaths.includes(pathname);
}

export function DesktopNavDropdown({
  group,
  pathname,
  open,
  onToggle,
  onNavigate,
}: {
  group: NavMenuGroup;
  pathname: string;
  open: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const active = isNavGroupActive(group, pathname);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition",
          active || open
            ? "bg-sky-700 text-white"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={`nav-menu-${group.key}`}
      >
        {group.label}
        <span aria-hidden="true" className="text-xs">
          ▾
        </span>
      </button>

      {open ? (
        <div
          id={`nav-menu-${group.key}`}
          role="menu"
          className="dropdown-surface absolute left-0 top-[calc(100%+8px)] z-40 w-72 rounded-xl border p-2 shadow-lg"
        >
          <ul className="space-y-1">
            {group.items.map((item) => {
              const itemActive = pathname === getPathFromHref(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "block rounded-lg px-3 py-2 transition",
                      itemActive ? "dropdown-item-active" : "hover:bg-slate-100",
                    )}
                    role="menuitem"
                  >
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    {item.description ? (
                      <p className="text-xs text-slate-600">{item.description}</p>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function MobileNavDropdown({ group, pathname }: { group: NavMenuGroup; pathname: string }) {
  const active = isNavGroupActive(group, pathname);

  return (
    <details
      className={cn(
        "dropdown-surface rounded-lg border",
        active ? "border-sky-200" : "border-slate-200",
      )}
    >
      <summary
        className={cn(
          "cursor-pointer list-none rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden",
          active ? "dropdown-item-active" : "hover:bg-slate-100",
        )}
      >
        <span className="flex items-center justify-between">
          {group.label}
          <span className="text-xs text-slate-500">▾</span>
        </span>
      </summary>
      <ul className="space-y-1 px-2 pb-2">
        {group.items.map((item) => {
          const itemActive = pathname === getPathFromHref(item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "block rounded-md px-2.5 py-2",
                  itemActive ? "dropdown-item-active" : "hover:bg-slate-100",
                )}
              >
                <p className="text-sm font-medium text-slate-900">{item.label}</p>
                {item.description ? <p className="text-xs text-slate-600">{item.description}</p> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
