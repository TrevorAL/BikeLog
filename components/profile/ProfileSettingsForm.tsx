"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { BellRing, Bike, Clock3, Mail, MessageSquare, Moon, Send } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  publishNotificationsEnabledValue,
  subscribeToNotificationsEnabledChange,
} from "@/lib/notification-sync";

type DistanceUnit = "MI" | "KM";
type PressureUnit = "PSI" | "BAR";
type NotificationSendPolicy = "INSTANT" | "DIGEST_DAILY";

type ProfileUser = {
  name: string | null;
  email: string | null;
  image: string | null;
  timezone: string | null;
  distanceUnit: DistanceUnit;
  pressureUnit: PressureUnit;
  selectedBikeId: string | null;
};

type ProfileBikeOption = {
  id: string;
  label: string;
};

type ProfileGoogleConnection = {
  connected: boolean;
  providerAccountId: string | null;
};

type ProfileStravaConnection = {
  scope: string;
  expiresAt: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  lastSyncStatus: "CONNECTED" | "SUCCESS" | "NO_NEW_DATA" | "ERROR";
  lastSyncAt: string | null;
  lastSyncError: string | null;
};

type ProfileConnections = {
  google: ProfileGoogleConnection;
  strava: ProfileStravaConnection | null;
};

type ProfileNotificationSettings = {
  notificationsEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  phoneNumber: string | null;
  sendPolicy: NotificationSendPolicy;
  digestHourLocal: number;
  quietHoursEnabled: boolean;
  quietHoursStartHour: number;
  quietHoursEndHour: number;
  sendWindowEnabled: boolean;
  sendWindowStartHour: number;
  sendWindowEndHour: number;
  bikes: Array<{
    bikeId: string;
    bikeLabel: string;
    enabled: boolean;
    emailEnabled: boolean;
    smsEnabled: boolean;
  }>;
};

type ProfileSettingsFormProps = {
  user: ProfileUser;
  bikes: ProfileBikeOption[];
  connections: ProfileConnections;
  notifications: ProfileNotificationSettings;
};

type FormStatus = {
  type: "idle" | "success" | "error";
  message?: string;
};

type FormState = {
  name: string;
  image: string;
  timezone: string;
  distanceUnit: DistanceUnit;
  pressureUnit: PressureUnit;
  selectedBikeId: string;
};

type ProfileUpdateResponse = {
  error?: string;
  user?: {
    name: string | null;
    image: string | null;
    timezone: string | null;
    distanceUnit: DistanceUnit;
    pressureUnit: PressureUnit;
    selectedBikeId: string | null;
  };
};

type ProfileAvatarUploadResponse = {
  error?: string;
  image?: string;
};

type NotificationPreferencesResponse = {
  error?: string;
  preferences?: ProfileNotificationSettings;
};

type NotificationBikeFormState = {
  bikeId: string;
  bikeLabel: string;
  enabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
};

type NotificationFormState = {
  notificationsEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  phoneNumber: string;
  sendPolicy: NotificationSendPolicy;
  digestHourLocal: number;
  quietHoursEnabled: boolean;
  quietHoursStartHour: number;
  quietHoursEndHour: number;
  sendWindowEnabled: boolean;
  sendWindowStartHour: number;
  sendWindowEndHour: number;
  bikes: NotificationBikeFormState[];
};

type ThemeMode = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "bikelog-theme-mode";

const SETTINGS_SECTIONS = [
  {
    id: "settings-preferences",
    label: "Profile",
    description: "Name, avatar, units, and default bike.",
  },
  {
    id: "settings-appearance",
    label: "Appearance",
    description: "Day, night, or match device.",
  },
  {
    id: "settings-notifications",
    label: "Notifications",
    description: "Reminder channels and per-bike delivery.",
  },
  {
    id: "settings-connections",
    label: "Connections",
    description: "Google and Strava accounts.",
  },
] as const;

function toFormState(user: ProfileUser): FormState {
  return {
    name: user.name ?? "",
    image: user.image ?? "",
    timezone: user.timezone ?? "",
    distanceUnit: user.distanceUnit,
    pressureUnit: user.pressureUnit,
    selectedBikeId: user.selectedBikeId ?? "",
  };
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function statusLabel(
  status: "CONNECTED" | "SUCCESS" | "NO_NEW_DATA" | "ERROR",
) {
  if (status === "CONNECTED") {
    return "Connected";
  }

  if (status === "SUCCESS") {
    return "Import complete";
  }

  if (status === "NO_NEW_DATA") {
    return "No new rides";
  }

  return "Sync error";
}

function maskProviderAccountId(providerAccountId: string | null) {
  if (!providerAccountId) {
    return "-";
  }

  if (providerAccountId.length <= 8) {
    return providerAccountId;
  }

  return `${providerAccountId.slice(0, 4)}...${providerAccountId.slice(-4)}`;
}

function getAvatarInitial(name: string, email: string | null) {
  const firstName = name.trim().split(/\s+/)[0];
  const fromName = firstName?.charAt(0);
  const fromEmail = email?.trim().charAt(0);
  return (fromName ?? fromEmail ?? "P").toUpperCase();
}

function isUploadedAvatarPath(value: string) {
  return value.startsWith("/uploads/avatars/");
}

function toNotificationFormState(
  notifications: ProfileNotificationSettings,
): NotificationFormState {
  return {
    notificationsEnabled: notifications.notificationsEnabled,
    emailEnabled: notifications.emailEnabled,
    smsEnabled: notifications.smsEnabled,
    phoneNumber: notifications.phoneNumber ?? "",
    sendPolicy: notifications.sendPolicy,
    digestHourLocal: notifications.digestHourLocal,
    quietHoursEnabled: notifications.quietHoursEnabled,
    quietHoursStartHour: notifications.quietHoursStartHour,
    quietHoursEndHour: notifications.quietHoursEndHour,
    sendWindowEnabled: notifications.sendWindowEnabled,
    sendWindowStartHour: notifications.sendWindowStartHour,
    sendWindowEndHour: notifications.sendWindowEndHour,
    bikes: notifications.bikes.map((bike) => ({
      bikeId: bike.bikeId,
      bikeLabel: bike.bikeLabel,
      enabled: bike.enabled,
      emailEnabled: bike.emailEnabled,
      smsEnabled: bike.smsEnabled,
    })),
  };
}

function formatHourLabel(hour: number) {
  const normalized = ((hour % 24) + 24) % 24;
  const period = normalized >= 12 ? "PM" : "AM";
  const displayHour = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${displayHour}:00 ${period}`;
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  value: hour,
  label: formatHourLabel(hour),
}));

const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "UTC",
];

function getSupportedTimezones() {
  try {
    const intlWithSupportedValues = Intl as typeof Intl & {
      supportedValuesOf?: (key: "timeZone") => string[];
    };
    const supportedTimezones = intlWithSupportedValues.supportedValuesOf?.("timeZone") ?? [];
    return Array.from(new Set(["UTC", ...supportedTimezones])).sort((a, b) =>
      a.localeCompare(b),
    );
  } catch {
    return COMMON_TIMEZONES;
  }
}

function formatTimezoneLabel(timezone: string) {
  if (timezone === "UTC") {
    return "UTC";
  }

  const [region, ...locationParts] = timezone.split("/");
  const location = locationParts.join(" / ").replaceAll("_", " ");
  return location ? `${location} (${region})` : timezone.replaceAll("_", " ");
}

function buildTimezoneOptions(currentTimezone: string, browserTimezone: string) {
  const preferred = COMMON_TIMEZONES.filter(Boolean);
  const allTimezones = getSupportedTimezones();
  const optionSet = new Set([
    ...preferred,
    browserTimezone,
    currentTimezone,
    ...allTimezones,
  ].filter((timezone) => timezone.trim().length > 0));

  return Array.from(optionSet).map((timezone) => ({
    value: timezone,
    label: formatTimezoneLabel(timezone),
  }));
}

function resolveSystemTheme() {
  if (typeof window === "undefined") {
    return "light" as const;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveThemeMode(mode: ThemeMode) {
  return mode === "system" ? resolveSystemTheme() : mode;
}

function applyResolvedTheme(mode: ThemeMode) {
  if (typeof document === "undefined") {
    return;
  }

  const resolved = resolveThemeMode(mode);
  const root = document.documentElement;
  root.setAttribute("data-theme", resolved);
  root.style.colorScheme = resolved;
}

export function ProfileSettingsForm({
  user,
  bikes,
  connections,
  notifications,
}: ProfileSettingsFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [form, setForm] = useState<FormState>(() => toFormState(user));
  const [saveStatus, setSaveStatus] = useState<FormStatus>({ type: "idle" });
  const [isSaving, setIsSaving] = useState(false);
  const [avatarStatus, setAvatarStatus] = useState<FormStatus>({ type: "idle" });
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isResettingAvatar, setIsResettingAvatar] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isDisconnectingStrava, setIsDisconnectingStrava] = useState(false);
  const [stravaConnection, setStravaConnection] = useState(connections.strava);
  const [stravaStatus, setStravaStatus] = useState<FormStatus>({ type: "idle" });
  const [notificationForm, setNotificationForm] = useState<NotificationFormState>(() =>
    toNotificationFormState(notifications),
  );
  const [notificationStatus, setNotificationStatus] = useState<FormStatus>({ type: "idle" });
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "system";
    }

    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" || stored === "system"
      ? stored
      : "system";
  });
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return subscribeToNotificationsEnabledChange((enabled) => {
      setNotificationForm((current) =>
        current.notificationsEnabled === enabled
          ? current
          : {
              ...current,
              notificationsEnabled: enabled,
            },
      );
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    applyResolvedTheme(themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    function handleSystemThemeChange() {
      if (themeMode === "system") {
        applyResolvedTheme("system");
      }
    }

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, [themeMode]);

  const browserTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "";
    }
  }, []);
  const timezoneOptions = useMemo(
    () => buildTimezoneOptions(form.timezone, browserTimezone),
    [browserTimezone, form.timezone],
  );

  const stravaFlashStatus = searchParams.get("strava");
  const stravaFlashMessage = searchParams.get("stravaMessage");
  const stickySidebarStyle = {
    top: "calc(var(--app-header-offset, 112px) + 16px)",
    maxHeight: "calc(100vh - var(--app-header-offset, 112px) - 32px)",
  };
  const settingsSectionStyle = {
    scrollMarginTop: "var(--app-header-offset, 112px)",
  };

  const avatarPath = form.image.trim();
  const avatarPreview = isUploadedAvatarPath(avatarPath) ? avatarPath : "";
  const avatarInitial = getAvatarInitial(form.name, user.email);
  const hasCustomAvatar = avatarPreview.length > 0;
  const hasBikeOptions = bikes.length > 0;
  const googleConnected = connections.google.connected;
  const selectedTimezone = form.timezone.trim();
  const notificationTimezone = selectedTimezone || "UTC";

  async function saveProfile() {
    setIsSaving(true);
    setSaveStatus({ type: "idle" });

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          image: form.image,
          timezone: form.timezone,
          distanceUnit: form.distanceUnit,
          pressureUnit: form.pressureUnit,
          selectedBikeId: form.selectedBikeId || undefined,
        }),
      });

      const payload = (await response.json()) as ProfileUpdateResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not save profile.");
      }

      if (payload.user) {
        setForm({
          name: payload.user.name ?? "",
          image: payload.user.image ?? "",
          timezone: payload.user.timezone ?? "",
          distanceUnit: payload.user.distanceUnit,
          pressureUnit: payload.user.pressureUnit,
          selectedBikeId: payload.user.selectedBikeId ?? "",
        });
      }

      setSaveStatus({
        type: "success",
        message: "Profile saved.",
      });
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not save profile right now.";
      setSaveStatus({
        type: "error",
        message,
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function disconnectStrava() {
    setIsDisconnectingStrava(true);
    setStravaStatus({ type: "idle" });

    try {
      const response = await fetch("/api/strava/disconnect", {
        method: "POST",
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not disconnect Strava.");
      }

      setStravaConnection(null);
      setStravaStatus({
        type: "success",
        message: "Strava disconnected.",
      });
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not disconnect Strava right now.";
      setStravaStatus({
        type: "error",
        message,
      });
    } finally {
      setIsDisconnectingStrava(false);
    }
  }

  async function uploadAvatar() {
    const selectedFile = avatarInputRef.current?.files?.[0];
    if (!selectedFile) {
      setAvatarStatus({
        type: "error",
        message: "Choose an image file first.",
      });
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarStatus({ type: "idle" });

    try {
      const formData = new FormData();
      formData.set("avatar", selectedFile);

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as ProfileAvatarUploadResponse;
      if (!response.ok || !payload.image) {
        throw new Error(payload.error ?? "Could not upload avatar.");
      }

      setForm((current) => ({
        ...current,
        image: payload.image ?? "",
      }));
      setAvatarStatus({
        type: "success",
        message: "Avatar uploaded.",
      });
      setSaveStatus({ type: "idle" });
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not upload avatar right now.";
      setAvatarStatus({
        type: "error",
        message,
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function resetAvatarToDefault() {
    setIsResettingAvatar(true);
    setAvatarStatus({ type: "idle" });

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: "",
        }),
      });

      const payload = (await response.json()) as ProfileUpdateResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not reset avatar.");
      }

      setForm((current) => ({
        ...current,
        image: "",
      }));
      setAvatarStatus({
        type: "success",
        message: "Switched to default avatar.",
      });
      setSaveStatus({ type: "idle" });
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not reset avatar right now.";
      setAvatarStatus({
        type: "error",
        message,
      });
    } finally {
      setIsResettingAvatar(false);
    }
  }

  async function saveNotificationSettings() {
    setIsSavingNotifications(true);
    setNotificationStatus({ type: "idle" });

    try {
      const response = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notificationsEnabled: notificationForm.notificationsEnabled,
          emailEnabled: notificationForm.emailEnabled,
          smsEnabled: notificationForm.smsEnabled,
          phoneNumber: notificationForm.phoneNumber.trim() || null,
          sendPolicy: notificationForm.sendPolicy,
          digestHourLocal: notificationForm.digestHourLocal,
          quietHoursEnabled: notificationForm.quietHoursEnabled,
          quietHoursStartHour: notificationForm.quietHoursStartHour,
          quietHoursEndHour: notificationForm.quietHoursEndHour,
          sendWindowEnabled: notificationForm.sendWindowEnabled,
          sendWindowStartHour: notificationForm.sendWindowStartHour,
          sendWindowEndHour: notificationForm.sendWindowEndHour,
          bikePreferences: notificationForm.bikes.map((bike) => ({
            bikeId: bike.bikeId,
            enabled: bike.enabled,
            emailEnabled: bike.emailEnabled,
            smsEnabled: bike.smsEnabled,
          })),
        }),
      });

      const payload = (await response.json()) as NotificationPreferencesResponse;
      if (!response.ok || !payload.preferences) {
        throw new Error(payload.error ?? "Could not save notification settings.");
      }

      setNotificationForm(toNotificationFormState(payload.preferences));
      publishNotificationsEnabledValue(payload.preferences.notificationsEnabled);
      setNotificationStatus({
        type: "success",
        message: "Notification settings saved.",
      });
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not save notification settings right now.";
      setNotificationStatus({
        type: "error",
        message,
      });
    } finally {
      setIsSavingNotifications(false);
    }
  }

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start lg:gap-6 lg:space-y-0">
      <aside
        className="surface-card p-3 lg:sticky lg:self-start lg:overflow-y-auto"
        style={stickySidebarStyle}
      >
        <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Settings
        </p>
        <nav className="grid gap-1" aria-label="Settings sections">
          {SETTINGS_SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="rounded-md px-2 py-2 text-left transition hover:bg-slate-100"
            >
              <p className="text-sm font-semibold text-slate-900">{section.label}</p>
              <p className="text-xs text-slate-600">{section.description}</p>
            </a>
          ))}
        </nav>
      </aside>

      <div className="space-y-6">
      <section
        id="settings-preferences"
        className="surface-card p-5"
        style={settingsSectionStyle}
      >
        <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900">Profile settings</h2>
        <p className="mt-1 text-sm text-slate-600">
          Manage your account details, default bike, and unit preferences.
        </p>

        <form
          className="mt-4 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            await saveProfile();
          }}
        >
          <div className="grid gap-3">
            <label className="text-sm text-slate-700">
              Name
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                placeholder="Your name"
              />
            </label>
          </div>

          <section className="surface-card-muted p-3">
            <p className="text-sm font-semibold text-slate-900">Profile picture</p>
            <div className="mt-2 inline-flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <div
                aria-hidden
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-brand-600 text-sm font-semibold text-white"
              >
                {hasCustomAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="Avatar preview" className="h-full w-full object-cover" />
                ) : (
                  <span>{avatarInitial}</span>
                )}
              </div>
              <span className="text-xs text-slate-600">
                {hasCustomAvatar ? "Custom avatar active" : "Default avatar active"}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="text-xs text-slate-700">
                Upload image
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700"
                />
              </label>
              <Button
                type="button"
                onClick={uploadAvatar}
                disabled={isUploadingAvatar || isResettingAvatar}
                variant="secondary"
                size="sm"
              >
                {isUploadingAvatar ? "Uploading..." : "Upload image"}
              </Button>
              <Button
                type="button"
                onClick={resetAvatarToDefault}
                disabled={!hasCustomAvatar || isUploadingAvatar || isResettingAvatar}
                variant="secondary"
                size="sm"
              >
                {isResettingAvatar ? "Resetting..." : "Use default"}
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              JPG, PNG, WEBP, or GIF up to 5 MB.
            </p>
          </section>

          {avatarStatus.type === "success" && avatarStatus.message ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {avatarStatus.message}
            </p>
          ) : null}

          {avatarStatus.type === "error" && avatarStatus.message ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {avatarStatus.message}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm text-slate-700 sm:col-span-2 lg:col-span-1">
              Timezone
              <select
                value={form.timezone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, timezone: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
              >
                <option value="">Select timezone</option>
                {timezoneOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                onClick={() => {
                  if (!browserTimezone) {
                    return;
                  }

                  setForm((current) => ({ ...current, timezone: browserTimezone }));
                }}
                variant="secondary"
                size="sm"
                className="mt-2"
              >
                Use browser timezone
              </Button>
              <span className="mt-1 block text-xs text-slate-500">
                Notification digest times use this timezone.
              </span>
            </label>

            <label className="text-sm text-slate-700">
              Distance unit
              <select
                value={form.distanceUnit}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    distanceUnit: event.target.value as DistanceUnit,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              >
                <option value="MI">Miles (mi)</option>
                <option value="KM">Kilometers (km)</option>
              </select>
            </label>

            <label className="text-sm text-slate-700">
              Pressure unit
              <select
                value={form.pressureUnit}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    pressureUnit: event.target.value as PressureUnit,
                  }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              >
                <option value="PSI">PSI</option>
                <option value="BAR">Bar</option>
              </select>
            </label>
          </div>

          <label className="block text-sm text-slate-700">
            Default bike
            <select
              value={form.selectedBikeId}
              onChange={(event) =>
                setForm((current) => ({ ...current, selectedBikeId: event.target.value }))
              }
              disabled={!hasBikeOptions}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              {hasBikeOptions ? null : <option value="">No bikes available</option>}
              {bikes.map((bike) => (
                <option key={bike.id} value={bike.id}>
                  {bike.label}
                </option>
              ))}
            </select>
          </label>

          <Button type="submit" disabled={isSaving} variant="primary" size="md">
            {isSaving ? "Saving..." : "Save profile"}
          </Button>

          {saveStatus.type === "success" && saveStatus.message ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {saveStatus.message}
            </p>
          ) : null}

          {saveStatus.type === "error" && saveStatus.message ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {saveStatus.message}
            </p>
          ) : null}
        </form>
      </section>

      <section
        id="settings-appearance"
        className="surface-card p-5"
        style={settingsSectionStyle}
      >
        <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900">
          Appearance
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Choose a display mode for BikeLog.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setThemeMode("light")}
            className={`rounded-lg border px-3 py-2 text-left transition ${
              themeMode === "light"
                ? "border-brand-600 bg-brand-50 text-brand-800"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            <p className="text-sm font-semibold">Day</p>
            <p className="text-xs">Always light theme.</p>
          </button>
          <button
            type="button"
            onClick={() => setThemeMode("dark")}
            className={`rounded-lg border px-3 py-2 text-left transition ${
              themeMode === "dark"
                ? "border-brand-600 bg-brand-50 text-brand-800"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            <p className="text-sm font-semibold">Night</p>
            <p className="text-xs">Always dark theme.</p>
          </button>
          <button
            type="button"
            onClick={() => setThemeMode("system")}
            className={`rounded-lg border px-3 py-2 text-left transition ${
              themeMode === "system"
                ? "border-brand-600 bg-brand-50 text-brand-800"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            <p className="text-sm font-semibold">Match device</p>
            <p className="text-xs">Follow your OS preference.</p>
          </button>
        </div>
      </section>

      <section
        id="settings-notifications"
        className="surface-card p-5"
        style={settingsSectionStyle}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900">
              Notifications
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Maintenance reminders, delivery channels, and quiet hours.
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
              notificationForm.notificationsEnabled
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {notificationForm.notificationsEnabled ? "Enabled" : "Paused"}
          </span>
        </div>

        <form
          className="mt-5 space-y-6"
          onSubmit={async (event) => {
            event.preventDefault();
            await saveNotificationSettings();
          }}
        >
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                  <BellRing className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Maintenance reminders</p>
                  <p className="text-xs text-slate-500">
                    {notificationForm.notificationsEnabled ? "Active" : "Paused"}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={notificationForm.notificationsEnabled}
                  onChange={(event) => {
                    const enabled = event.target.checked;
                    setNotificationForm((current) => ({
                      ...current,
                      notificationsEnabled: enabled,
                    }));
                    publishNotificationsEnabledValue(enabled);
                  }}
                  className="peer sr-only"
                  aria-label="Enable maintenance reminders"
                />
                <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-brand-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-300" />
                <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
              </label>
            </div>

            <div className="px-4 py-4">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-slate-500" />
                <p className="text-sm font-semibold text-slate-900">Account delivery methods</p>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                    notificationForm.emailEnabled
                      ? "border-brand-300 bg-brand-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={notificationForm.emailEnabled}
                    onChange={(event) =>
                      setNotificationForm((current) => ({
                        ...current,
                        emailEnabled: event.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-300"
                  />
                  <span className="flex min-w-0 gap-3">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">Email</span>
                      <span className="block text-xs text-slate-500">{user.email ?? "No email set"}</span>
                    </span>
                  </span>
                </label>

                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                    notificationForm.smsEnabled
                      ? "border-brand-300 bg-brand-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={notificationForm.smsEnabled}
                    onChange={(event) =>
                      setNotificationForm((current) => ({
                        ...current,
                        smsEnabled: event.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-300"
                  />
                  <span className="flex min-w-0 gap-3">
                    <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">Text message</span>
                      <span className="block text-xs text-slate-500">
                        {notificationForm.phoneNumber.trim() || "No phone set"}
                      </span>
                    </span>
                  </span>
                </label>
              </div>

              <label className="mt-3 block text-sm text-slate-700">
                SMS phone number
                <input
                  type="tel"
                  value={notificationForm.phoneNumber}
                  onChange={(event) =>
                    setNotificationForm((current) => ({
                      ...current,
                      phoneNumber: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  placeholder="+1 555 555 1234"
                />
              </label>
            </div>

            <div className="px-4 py-4">
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-slate-500" />
                <p className="text-sm font-semibold text-slate-900">Schedule</p>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,_1fr)_220px]">
                <div className="grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
                  {[
                    { value: "DIGEST_DAILY", label: "Daily digest" },
                    { value: "INSTANT", label: "Instant" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setNotificationForm((current) => ({
                          ...current,
                          sendPolicy: option.value as NotificationSendPolicy,
                        }))
                      }
                      className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                        notificationForm.sendPolicy === option.value
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <label className="text-sm text-slate-700">
                  Digest time
                  <select
                    value={notificationForm.digestHourLocal}
                    onChange={(event) =>
                      setNotificationForm((current) => ({
                        ...current,
                        digestHourLocal: Number(event.target.value),
                      }))
                    }
                    disabled={notificationForm.sendPolicy !== "DIGEST_DAILY"}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 disabled:cursor-not-allowed disabled:bg-slate-50"
                  >
                    {HOUR_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <p
                className={`mt-2 rounded-md px-3 py-2 text-xs ${
                  selectedTimezone
                    ? "bg-slate-50 text-slate-600"
                    : "bg-amber-50 text-amber-900"
                }`}
              >
                Digest timing uses {notificationTimezone}. Save profile settings after changing
                timezone.
              </p>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={notificationForm.sendWindowEnabled}
                      onChange={(event) =>
                        setNotificationForm((current) => ({
                          ...current,
                          sendWindowEnabled: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-300"
                    />
                    Allowed send window
                  </label>

                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <label className="text-xs text-slate-700">
                      Start
                      <select
                        value={notificationForm.sendWindowStartHour}
                        onChange={(event) =>
                          setNotificationForm((current) => ({
                            ...current,
                            sendWindowStartHour: Number(event.target.value),
                          }))
                        }
                        disabled={!notificationForm.sendWindowEnabled}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-50"
                      >
                        {HOUR_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-slate-700">
                      End
                      <select
                        value={notificationForm.sendWindowEndHour}
                        onChange={(event) =>
                          setNotificationForm((current) => ({
                            ...current,
                            sendWindowEndHour: Number(event.target.value),
                          }))
                        }
                        disabled={!notificationForm.sendWindowEnabled}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-50"
                      >
                        {HOUR_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={notificationForm.quietHoursEnabled}
                      onChange={(event) =>
                        setNotificationForm((current) => ({
                          ...current,
                          quietHoursEnabled: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-300"
                    />
                    <Moon className="h-4 w-4 text-slate-500" />
                    Quiet hours
                  </label>

                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <label className="text-xs text-slate-700">
                      Start
                      <select
                        value={notificationForm.quietHoursStartHour}
                        onChange={(event) =>
                          setNotificationForm((current) => ({
                            ...current,
                            quietHoursStartHour: Number(event.target.value),
                          }))
                        }
                        disabled={!notificationForm.quietHoursEnabled}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-50"
                      >
                        {HOUR_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-slate-700">
                      End
                      <select
                        value={notificationForm.quietHoursEndHour}
                        onChange={(event) =>
                          setNotificationForm((current) => ({
                            ...current,
                            quietHoursEndHour: Number(event.target.value),
                          }))
                        }
                        disabled={!notificationForm.quietHoursEnabled}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-50"
                      >
                        {HOUR_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <Bike className="h-4 w-4 text-slate-500" />
              <p className="text-sm font-semibold text-slate-900">Bike reminder rules</p>
            </div>

            <div className="mt-3 space-y-2">
              {notificationForm.bikes.map((bike, index) => {
                const mode =
                  !bike.enabled
                    ? "off"
                    : bike.emailEnabled && bike.smsEnabled
                      ? "both"
                      : bike.emailEnabled
                        ? "email"
                        : bike.smsEnabled
                          ? "sms"
                          : "off";

                return (
                  <div
                    key={bike.bikeId}
                    className="grid gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 sm:grid-cols-[minmax(0,_1fr)_220px]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {bike.bikeLabel}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {mode === "off"
                          ? "Muted"
                          : mode === "both"
                            ? "Email + text"
                            : mode === "sms"
                              ? "Text"
                              : "Email"}
                      </p>
                    </div>
                    <label className="text-xs text-slate-700">
                      Delivery
                      <select
                        value={mode}
                        onChange={(event) => {
                          const value = event.target.value;
                          setNotificationForm((current) => {
                            const nextBikes = [...current.bikes];
                            const nextBike = { ...nextBikes[index] };

                            if (value === "off") {
                              nextBike.enabled = false;
                              nextBike.emailEnabled = false;
                              nextBike.smsEnabled = false;
                            } else if (value === "email") {
                              nextBike.enabled = true;
                              nextBike.emailEnabled = true;
                              nextBike.smsEnabled = false;
                            } else if (value === "sms") {
                              nextBike.enabled = true;
                              nextBike.emailEnabled = false;
                              nextBike.smsEnabled = true;
                            } else {
                              nextBike.enabled = true;
                              nextBike.emailEnabled = true;
                              nextBike.smsEnabled = true;
                            }

                            nextBikes[index] = nextBike;
                            return {
                              ...current,
                              bikes: nextBikes,
                            };
                          });
                        }}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-900"
                      >
                        <option value="email">Email</option>
                        <option value="sms">Text</option>
                        <option value="both">Email + Text</option>
                        <option value="off">Off</option>
                      </select>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          {notificationForm.smsEnabled &&
          notificationForm.phoneNumber.trim().length === 0 ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              SMS is enabled, but no phone number is set.
            </p>
          ) : null}

          <Button type="submit" disabled={isSavingNotifications} variant="primary" size="md">
            {isSavingNotifications ? "Saving..." : "Save notifications"}
          </Button>

          {notificationStatus.type === "success" && notificationStatus.message ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {notificationStatus.message}
            </p>
          ) : null}

          {notificationStatus.type === "error" && notificationStatus.message ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {notificationStatus.message}
            </p>
          ) : null}
        </form>
      </section>

      <section
        id="settings-connections"
        className="surface-card p-5"
        style={settingsSectionStyle}
      >
        <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900">Account connections</h2>
        <p className="mt-1 text-sm text-slate-600">
          Manage your connected providers for sign-in and ride imports.
        </p>

        {(stravaFlashStatus === "connected" || stravaFlashStatus === "error") &&
        stravaFlashMessage ? (
          <p
            className={`mt-3 rounded-lg px-3 py-2 text-sm ${
              stravaFlashStatus === "connected"
                ? "bg-emerald-50 text-emerald-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            {stravaFlashMessage}
          </p>
        ) : null}

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Google</h3>
                <p className="mt-1 text-xs text-slate-600">
                  {googleConnected
                    ? "Connected for authentication."
                    : "Not connected yet."}
                </p>
              </div>
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                  googleConnected
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {googleConnected ? "Connected" : "Not connected"}
              </span>
            </div>

            <p className="mt-3 text-xs text-slate-600">
              Account ID: <span className="font-semibold">{maskProviderAccountId(connections.google.providerAccountId)}</span>
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={async () => {
                  setIsGoogleSubmitting(true);
                  try {
                    await signIn("google", {
                      redirectTo: "/settings",
                    }, {
                      prompt: "select_account",
                    });
                  } finally {
                    setIsGoogleSubmitting(false);
                  }
                }}
                disabled={isGoogleSubmitting}
              >
                {isGoogleSubmitting
                  ? "Redirecting..."
                  : googleConnected
                    ? "Reconnect Google"
                    : "Connect Google"}
              </Button>

              <a
                href="https://myaccount.google.com/security"
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Manage Google account
              </a>
            </div>
          </article>

          <article className="rounded-lg border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Strava</h3>
                <p className="mt-1 text-xs text-slate-600">
                  {stravaConnection
                    ? "Connected for activity imports."
                    : "Connect Strava to import rides."}
                </p>
              </div>
              <span
                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                  stravaConnection
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {stravaConnection ? "Connected" : "Not connected"}
              </span>
            </div>

            {stravaConnection ? (
              <div className="mt-3 space-y-1 text-xs text-slate-600">
                <p>
                  Athlete:{" "}
                  <span className="font-semibold">
                    {[stravaConnection.firstName, stravaConnection.lastName]
                      .filter(Boolean)
                      .join(" ")
                      .trim() || stravaConnection.username || "-"}
                  </span>
                </p>
                <p>
                  Scope: <span className="font-semibold">{stravaConnection.scope}</span>
                </p>
                <p>
                  Token expires:{" "}
                  <span className="font-semibold">
                    {formatDateTime(stravaConnection.expiresAt)}
                  </span>
                </p>
                <p>
                  Last sync:{" "}
                  <span className="font-semibold">
                    {formatDateTime(stravaConnection.lastSyncAt)}
                  </span>
                </p>
                <p>
                  Status:{" "}
                  <span className="font-semibold">
                    {statusLabel(stravaConnection.lastSyncStatus)}
                  </span>
                </p>
              </div>
            ) : null}

            {stravaConnection?.lastSyncStatus === "ERROR" && stravaConnection.lastSyncError ? (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
                {stravaConnection.lastSyncError}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <Button href="/api/strava/connect?redirectTo=/settings" variant="secondary" size="sm">
                {stravaConnection ? "Reconnect Strava" : "Connect Strava"}
              </Button>

              {stravaConnection ? (
                <button
                  type="button"
                  onClick={async () => {
                    await disconnectStrava();
                  }}
                  disabled={isDisconnectingStrava}
                  className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDisconnectingStrava ? "Disconnecting..." : "Disconnect Strava"}
                </button>
              ) : null}
            </div>
          </article>
        </div>

        {stravaStatus.type === "success" && stravaStatus.message ? (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {stravaStatus.message}
          </p>
        ) : null}

        {stravaStatus.type === "error" && stravaStatus.message ? (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {stravaStatus.message}
          </p>
        ) : null}
      </section>
    </div>
    </div>
  );
}
