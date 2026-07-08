"use client";

import Link from "next/link";
import { motion } from "framer-motion";

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
  const highlighted = active || open;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "relative inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition",
          highlighted ? "text-white" : "text-slate-300 hover:bg-white/10 hover:text-white",
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={`nav-menu-${group.key}`}
      >
        {highlighted ? (
          <motion.span
            layoutId="desktop-nav-active"
            className="absolute inset-0 rounded-md bg-brand-600"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        ) : null}
        <span className="relative z-10">{group.label}</span>
        <span aria-hidden="true" className="relative z-10 text-xs">
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

