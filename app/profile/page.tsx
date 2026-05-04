import { AppShell } from "@/components/layout/AppShell";
import { ProfileOverview } from "@/components/profile/ProfileOverview";
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
  };
  selectedBikeLabel?: string;
};

function formatBikeLabel(input: {
  name: string;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
}) {
  const detailed = [input.year, input.brand, input.model].filter(Boolean).join(" ").trim();
  return detailed.length > 0 ? detailed : input.name;
}

async function getProfilePageData(userId: string): Promise<ProfilePageData> {
  try {
    const [user, fallbackBike] = await Promise.all([
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
      prisma.bike.findFirst({
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
    ]);

    if (!user) {
      return {
        dbConnected: true,
      };
    }

    const selectedBikeRecord = user.selectedBikeId
      ? await prisma.bike.findFirst({
          where: {
            id: user.selectedBikeId,
            userId,
            isArchived: false,
          },
          select: {
            name: true,
            brand: true,
            model: true,
            year: true,
          },
        })
      : null;

    return {
      dbConnected: true,
      user: {
        name: user.name,
        email: user.email,
        image: user.image,
        timezone: user.timezone,
        distanceUnit: user.distanceUnit,
        pressureUnit: user.pressureUnit,
      },
      selectedBikeLabel: selectedBikeRecord
        ? formatBikeLabel(selectedBikeRecord)
        : fallbackBike
          ? formatBikeLabel(fallbackBike)
          : "No bike selected",
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
      description="Account snapshot and quick links."
    >
      {!data.dbConnected ? (
        <section className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5 text-red-800 shadow-sm">
          <h2 className="font-display text-lg font-semibold tracking-tight">Database not connected</h2>
          <p className="mt-2 text-sm">
            Set <code>DATABASE_URL</code>, run <code>npm run db:push</code>, and then{" "}
            <code>npm run db:seed</code>.
          </p>
        </section>
      ) : null}

      {data.user ? (
        <ProfileOverview
          user={data.user}
          selectedBikeLabel={data.selectedBikeLabel ?? "No bike selected"}
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
