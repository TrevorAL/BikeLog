"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, ChevronRight, Loader2, Settings, Wrench } from "lucide-react";

import {
  publishNotificationsEnabledValue,
  readNotificationsEnabledValue,
  subscribeToNotificationsEnabledChange,
} from "@/lib/notification-sync";

type NotificationItem = {
  id: string;
  bikeId: string;
  bikeLabel: string;
  label: string;
  status: "DUE_NOW" | "OVERDUE";
  detail: string;
  href: string;
};

type NotificationStateResponse = {
  state?: {
    notificationsEnabled: boolean;
    pendingCount: number;
    items: NotificationItem[];
  };
  error?: string;
};

type NotificationBellProps = {
  className?: string;
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getStatusLabel(status: NotificationItem["status"]) {
  return status === "OVERDUE" ? "Overdue" : "Due now";
}

export function NotificationBell({ className }: NotificationBellProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    () => readNotificationsEnabledValue() ?? true,
  );
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadState() {
      setIsLoading(true);
      setLoadError(null);
      const key = `bikelog-notification-dispatch:${todayKey()}`;
      const hasDispatched =
        typeof window !== "undefined" && window.sessionStorage.getItem(key) === "1";
      const requestUrl = hasDispatched
        ? "/api/notifications/state"
        : "/api/notifications/state?dispatch=1";

      if (!hasDispatched && typeof window !== "undefined") {
        window.sessionStorage.setItem(key, "1");
      }

      try {
        const response = await fetch(requestUrl, {
          method: "GET",
          headers: {
            "Cache-Control": "no-store",
          },
        });
        const payload = (await response.json()) as NotificationStateResponse;
        if (!response.ok) {
          throw new Error(payload.error ?? "Could not load notifications.");
        }

        if (!cancelled && payload.state) {
          setNotificationsEnabled(payload.state.notificationsEnabled);
          publishNotificationsEnabledValue(payload.state.notificationsEnabled);
          setPendingCount(payload.state.pendingCount);
          setItems(payload.state.items ?? []);
        }
      } catch {
        if (!cancelled) {
          setNotificationsEnabled(true);
          setPendingCount(0);
          setItems([]);
          setLoadError("Could not load notifications.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return subscribeToNotificationsEnabledChange((enabled) => {
      setNotificationsEnabled(enabled);
    });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node) || containerRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const visibleCount = pendingCount > 99 ? "99+" : String(pendingCount);

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`${pendingCount} maintenance notification${pendingCount === 1 ? "" : "s"}`}
        title="Notifications"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : notificationsEnabled ? (
          <Bell className="h-4 w-4" />
        ) : (
          <BellOff className="h-4 w-4" />
        )}
        {!isLoading && pendingCount > 0 ? (
          <span
            className={`absolute -right-1 -top-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white ${
              notificationsEnabled ? "bg-orange-500" : "bg-slate-500"
            }`}
          >
            {visibleCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Notifications</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {notificationsEnabled
                    ? "Maintenance reminders from your bikes."
                    : "Delivery is paused in settings."}
                </p>
              </div>
              <Link
                href="/settings#settings-notifications"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                aria-label="Open notification settings"
                title="Notification settings"
              >
                <Settings className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loadError ? (
              <p className="px-4 py-4 text-sm text-red-700">{loadError}</p>
            ) : isLoading ? (
              <div className="flex items-center gap-2 px-4 py-4 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading notifications
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-5 text-sm text-slate-600">
                <p className="font-medium text-slate-900">Nothing due right now</p>
                <p className="mt-1 text-xs text-slate-500">
                  New maintenance reminders will appear here when a bike needs attention.
                </p>
              </div>
            ) : (
              <div className="py-1">
                {items.map((item) => (
                  <Link
                    role="menuitem"
                    key={item.id}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="flex gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                  >
                    <span
                      className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        item.status === "OVERDUE"
                          ? "bg-red-50 text-red-700"
                          : "bg-orange-50 text-orange-700"
                      }`}
                    >
                      <Wrench className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-900">
                          {item.label}
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            item.status === "OVERDUE"
                              ? "bg-red-50 text-red-700"
                              : "bg-orange-50 text-orange-700"
                          }`}
                        >
                          {getStatusLabel(item.status)}
                        </span>
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {item.bikeLabel}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-600">
                        {item.detail}
                      </span>
                    </span>
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-4 py-2">
            <Link
              href="/maintenance"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900"
            >
              Open maintenance
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
