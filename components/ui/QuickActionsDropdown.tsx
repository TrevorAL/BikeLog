"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

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
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const detailsElement = detailsRef.current;
      if (!detailsElement) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!detailsElement.contains(target)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  if (items.length === 0) {
    return null;
  }

  return (
    <details
      ref={detailsRef}
      open={isOpen}
      onToggle={(event) => {
        setIsOpen(event.currentTarget.open);
      }}
      className="group relative"
    >
      <summary
        className={cn(
          "flex list-none cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden",
        )}
      >
        {label}
        <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
      </summary>
      <div className="dropdown-surface absolute right-0 z-40 mt-2 w-56 rounded-lg border p-1.5 shadow-lg">
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={`${item.href}-${item.label}`}>
              <Link
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
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
