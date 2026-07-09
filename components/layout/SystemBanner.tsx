"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const ACCENTS = {
  info: "border-l-sky-500",
  warning: "border-l-amber-500",
} as const;

type SystemBannerProps = {
  /** sessionStorage key scoping the dismissal; dismissed banners stay hidden for the session. */
  dismissKey: string;
  accent: keyof typeof ACCENTS;
  children: ReactNode;
  action?: ReactNode;
};

/**
 * Slim, dismissible system banner: neutral surface with a colored accent
 * border instead of a full-bleed colored slab, single-line layout.
 */
export function SystemBanner({ dismissKey, accent, children, action }: SystemBannerProps) {
  const storageKey = `bikelog.banner.${dismissKey}`;
  // SSR renders the banner; previously-dismissed sessions hide it on mount.
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // sessionStorage is only readable post-hydration; SSR must render the
    // banner, so this one-time sync read after mount is intentional.
    try {
      if (sessionStorage.getItem(storageKey) === "1") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDismissed(true);
      }
    } catch {
      // sessionStorage unavailable: keep the banner visible.
    }
  }, [storageKey]);

  if (dismissed) {
    return null;
  }

  return (
    <div
      role="status"
      className={cn(
        "surface-card mb-6 flex items-center gap-3 rounded-xl border-l-4 py-2.5 pl-4 pr-2",
        ACCENTS[accent],
      )}
    >
      <div className="min-w-0 flex-1 text-sm text-slate-700">{children}</div>
      {action ? <div className="shrink-0">{action}</div> : null}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          try {
            sessionStorage.setItem(storageKey, "1");
          } catch {
            // Non-fatal: banner reappears next session.
          }
          setDismissed(true);
        }}
        className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
