import { Button } from "@/components/ui/Button";

type ProfileOverviewProps = {
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
    timezone: string | null;
    distanceUnit: "MI" | "KM";
    pressureUnit: "PSI" | "BAR";
  };
  selectedBikeLabel: string;
};

function getProfileInitial(name: string | null, email: string | null) {
  const firstName = name?.trim().split(/\s+/)[0];
  const fromName = firstName?.charAt(0);
  const fromEmail = email?.trim().charAt(0);
  return (fromName ?? fromEmail ?? "P").toUpperCase();
}

function getCustomAvatarUrl(userImage: string | null) {
  const normalized = userImage?.trim();
  if (!normalized) {
    return null;
  }

  return normalized.startsWith("/uploads/avatars/") ? normalized : null;
}

export function ProfileOverview({ user, selectedBikeLabel }: ProfileOverviewProps) {
  const profileImageUrl = getCustomAvatarUrl(user.image);
  const profileInitial = getProfileInitial(user.name, user.email);
  const displayName = user.name?.trim() || "Unnamed rider";

  return (
    <div className="space-y-6">
      <section className="surface-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              aria-hidden
              className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-brand-600 text-lg font-semibold text-white"
            >
              {profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profileImageUrl} alt={`${displayName} profile`} className="h-full w-full object-cover" />
              ) : (
                <span>{profileInitial}</span>
              )}
            </div>
            <div>
              <p className="font-display text-xl font-semibold text-slate-900">{displayName}</p>
              <p className="text-sm text-slate-600">{user.email ?? "-"}</p>
            </div>
          </div>
          <Button href="/settings" variant="secondary" size="md">
            Open settings
          </Button>
        </div>
      </section>

      <section className="surface-card p-5">
        <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900">
          Profile details
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <article className="surface-card-muted px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-600">Current bike</p>
            <p className="text-sm font-semibold text-slate-900">{selectedBikeLabel}</p>
          </article>
          <article className="surface-card-muted px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-600">Timezone</p>
            <p className="text-sm font-semibold text-slate-900">{user.timezone || "Not set"}</p>
          </article>
          <article className="surface-card-muted px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-600">Distance</p>
            <p className="text-sm font-semibold text-slate-900">
              {user.distanceUnit === "MI" ? "Miles (mi)" : "Kilometers (km)"}
            </p>
          </article>
          <article className="surface-card-muted px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-600">Pressure</p>
            <p className="text-sm font-semibold text-slate-900">
              {user.pressureUnit === "PSI" ? "PSI" : "Bar"}
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
