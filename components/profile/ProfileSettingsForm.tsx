"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

import { SignOutButton } from "@/components/layout/SignOutButton";

type DistanceUnit = "MI" | "KM";
type PressureUnit = "PSI" | "BAR";

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

type ProfileSettingsFormProps = {
  user: ProfileUser;
  bikes: ProfileBikeOption[];
  connections: ProfileConnections;
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

export function ProfileSettingsForm({
  user,
  bikes,
  connections,
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
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const browserTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "";
    }
  }, []);

  const stravaFlashStatus = searchParams.get("strava");
  const stravaFlashMessage = searchParams.get("stravaMessage");

  const avatarPath = form.image.trim();
  const avatarPreview = isUploadedAvatarPath(avatarPath) ? avatarPath : "";
  const avatarInitial = getAvatarInitial(form.name, user.email);
  const hasCustomAvatar = avatarPreview.length > 0;
  const hasBikeOptions = bikes.length > 0;
  const googleConnected = connections.google.connected;
  const selectedBikeLabel =
    bikes.find((bike) => bike.id === form.selectedBikeId)?.label ??
    bikes[0]?.label ??
    "No bike selected";

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

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900">Account summary</h2>
        <p className="mt-1 text-sm text-slate-600">
          Profile and session details moved from the top bar.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-600">Email</p>
            <p className="text-sm font-semibold text-slate-900">{user.email ?? "-"}</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-600">Current bike</p>
            <p className="text-sm font-semibold text-slate-900">{selectedBikeLabel}</p>
          </div>
        </div>
        <div className="mt-4">
          <SignOutButton />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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

          <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-900">Profile picture</p>
            <div className="mt-2 inline-flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <div
                aria-hidden
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-sky-600 text-sm font-semibold text-white"
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
              <button
                type="button"
                onClick={uploadAvatar}
                disabled={isUploadingAvatar || isResettingAvatar}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUploadingAvatar ? "Uploading..." : "Upload image"}
              </button>
              <button
                type="button"
                onClick={resetAvatarToDefault}
                disabled={!hasCustomAvatar || isUploadingAvatar || isResettingAvatar}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isResettingAvatar ? "Resetting..." : "Use default"}
              </button>
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
              <input
                value={form.timezone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, timezone: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                placeholder="America/New_York"
              />
              <button
                type="button"
                onClick={() => {
                  if (!browserTimezone) {
                    return;
                  }

                  setForm((current) => ({ ...current, timezone: browserTimezone }));
                }}
                className="mt-2 rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Use browser timezone
              </button>
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

          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save profile"}
          </button>

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

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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
              <button
                type="button"
                onClick={async () => {
                  setIsGoogleSubmitting(true);
                  try {
                    await signIn("google", {
                      redirectTo: "/profile",
                    }, {
                      prompt: "select_account",
                    });
                  } finally {
                    setIsGoogleSubmitting(false);
                  }
                }}
                disabled={isGoogleSubmitting}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGoogleSubmitting
                  ? "Redirecting..."
                  : googleConnected
                    ? "Reconnect Google"
                    : "Connect Google"}
              </button>

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
              <Link
                href="/api/strava/connect?redirectTo=/profile"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                {stravaConnection ? "Reconnect Strava" : "Connect Strava"}
              </Link>

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
  );
}
