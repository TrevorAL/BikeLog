"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

import {
  publishNotificationsEnabledValue,
  readNotificationsEnabledValue,
  subscribeToNotificationsEnabledChange,
} from "@/lib/notification-sync";

type NotificationStateResponse = {
  state?: {
    notificationsEnabled: boolean;
    pendingCount: number;
  };
  error?: string;
};

type NotificationPreferencesResponse = {
  preferences?: {
    notificationsEnabled: boolean;
  };
  error?: string;
};

type NotificationBellProps = {
  className?: string;
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function NotificationBell({ className }: NotificationBellProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    () => readNotificationsEnabledValue() ?? true,
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadState() {
      setIsLoading(true);
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
          throw new Error(payload.error ?? "Could not load notification state.");
        }

        if (!cancelled && payload.state) {
          setNotificationsEnabled(payload.state.notificationsEnabled);
          publishNotificationsEnabledValue(payload.state.notificationsEnabled);
          setPendingCount(payload.state.pendingCount);
        }
      } catch {
        if (!cancelled) {
          setNotificationsEnabled(true);
          setPendingCount(0);
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

  async function toggleNotifications() {
    if (isUpdating) {
      return;
    }

    const nextValue = !notificationsEnabled;
    setIsUpdating(true);

    try {
      const response = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notificationsEnabled: nextValue,
        }),
      });
      const payload = (await response.json()) as NotificationPreferencesResponse;
      if (!response.ok || !payload.preferences) {
        throw new Error(payload.error ?? "Could not update notification state.");
      }

      setNotificationsEnabled(payload.preferences.notificationsEnabled);
      publishNotificationsEnabledValue(payload.preferences.notificationsEnabled);
    } catch {
      // Leave the current bell state unchanged if the update fails.
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => {
          void toggleNotifications();
        }}
        disabled={isLoading || isUpdating}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        aria-label={
          notificationsEnabled
            ? "Notifications enabled. Click to mute notifications."
            : "Notifications muted. Click to enable notifications."
        }
        title={
          notificationsEnabled
            ? "Notifications enabled (click to mute)"
            : "Notifications muted (click to enable)"
        }
      >
        {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        {notificationsEnabled && pendingCount > 0 ? (
          <span className="absolute -right-1 -top-1 rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
            {pendingCount > 99 ? "99+" : pendingCount}
          </span>
        ) : null}
      </button>
    </div>
  );
}
