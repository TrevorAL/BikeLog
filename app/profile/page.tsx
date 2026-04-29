import { AppShell } from "@/components/layout/AppShell";
import { ProfileSettingsForm } from "@/components/profile/ProfileSettingsForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireServerUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type ProfilePageData = {
  dbConnected: boolean;
  user?: {
    name: string | null;
    email: string | null;
    image: string | null;
    timezone: string | null;
    distanceUnit: "MI" | "KM";
    pressureUnit: "PSI" | "BAR";
    selectedBikeId: string | null;
  };
  bikes?: Array<{
    id: string;
    label: string;
  }>;
  connections?: {
    google: {
      connected: boolean;
      providerAccountId: string | null;
    };
    strava: {
      scope: string;
      expiresAt: string;
      username: string | null;
      firstName: string | null;
      lastName: string | null;
      lastSyncStatus: "CONNECTED" | "SUCCESS" | "NO_NEW_DATA" | "ERROR";
      lastSyncAt: string | null;
      lastSyncError: string | null;
    } | null;
  };
};

function bikeLabel(input: {
  name: string;
  brand: string | null;
  model: string | null;
  year: number | null;
}) {
  const detailed = [input.year, input.brand, input.model].filter(Boolean).join(" ").trim();
  return detailed.length > 0 ? detailed : input.name;
}

async function getProfilePageData(userId: string): Promise<ProfilePageData> {
  try {
    const [user, bikes, googleAccount, stravaConnection] = await Promise.all([
      prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          name: true,
          email: true,
          image: true,
          timezone: true,
          distanceUnit: true,
          pressureUnit: true,
          selectedBikeId: true,
        },
      }),
      prisma.bike.findMany({
        where: {
          userId,
          isArchived: false,
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          name: true,
          brand: true,
          model: true,
          year: true,
        },
      }),
      prisma.account.findFirst({
        where: {
          userId,
          provider: "google",
        },
        select: {
          providerAccountId: true,
        },
      }),
      prisma.stravaConnection.findUnique({
        where: {
          userId,
        },
        select: {
          scope: true,
          expiresAt: true,
          username: true,
          firstName: true,
          lastName: true,
          lastSyncStatus: true,
          lastSyncAt: true,
          lastSyncError: true,
        },
      }),
    ]);

    if (!user) {
      return {
        dbConnected: true,
      };
    }

    return {
      dbConnected: true,
      user: {
        name: user.name,
        email: user.email,
        image: user.image,
        timezone: user.timezone,
        distanceUnit: user.distanceUnit,
        pressureUnit: user.pressureUnit,
        selectedBikeId: user.selectedBikeId,
      },
      bikes: bikes.map((bike) => ({
        id: bike.id,
        label: bikeLabel(bike),
      })),
      connections: {
        google: {
          connected: Boolean(googleAccount),
          providerAccountId: googleAccount?.providerAccountId ?? null,
        },
        strava: stravaConnection
          ? {
              scope: stravaConnection.scope,
              expiresAt: stravaConnection.expiresAt.toISOString(),
              username: stravaConnection.username,
              firstName: stravaConnection.firstName,
              lastName: stravaConnection.lastName,
              lastSyncStatus: stravaConnection.lastSyncStatus,
              lastSyncAt: stravaConnection.lastSyncAt?.toISOString() ?? null,
              lastSyncError: stravaConnection.lastSyncError,
            }
          : null,
      },
    };
  } catch {
    return {
      dbConnected: false,
    };
  }
}

export default async function ProfilePage() {
  const authUser = await requireServerUser();
  const data = await getProfilePageData(authUser.id);

  return (
    <AppShell
      title="Profile"
      description="Update your account details, preferences, and connections."
    >
      {!data.dbConnected ? (
        <section className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800 shadow-warm">
          <h2 className="font-display text-xl font-semibold">Database not connected</h2>
          <p className="mt-2 text-sm">
            Set <code>DATABASE_URL</code>, run <code>npm run db:push</code>, and then{" "}
            <code>npm run db:seed</code>.
          </p>
        </section>
      ) : null}

      {data.user && data.bikes && data.connections ? (
        <ProfileSettingsForm
          user={data.user}
          bikes={data.bikes}
          connections={data.connections}
        />
      ) : (
        <EmptyState
          title="Profile data unavailable"
          description="Sign in again or refresh the page."
        />
      )}
    </AppShell>
  );
}
