import { prisma } from "@/lib/db";

async function getFirstOwnedBike(userId: string) {
  return prisma.bike.findFirst({
    where: {
      userId,
      isArchived: false,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
    },
  });
}

function isSelectedBikeFieldUnavailable(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("selectedBikeId") ||
    error.message.includes("selectedBike") ||
    error.message.includes("Unknown field")
  );
}

async function syncSelectedBikeIdForUser(input: {
  userId: string;
  fallbackBikeId?: string | null;
}) {
  let user: {
    selectedBikeId: string | null;
    selectedBike: { id: string; userId: string | null; isArchived: boolean } | null;
  } | null = null;

  try {
    user = await prisma.user.findUnique({
      where: {
        id: input.userId,
      },
      select: {
        selectedBikeId: true,
        selectedBike: {
          select: {
            id: true,
            userId: true,
            isArchived: true,
          },
        },
      },
    });
  } catch (error) {
    if (isSelectedBikeFieldUnavailable(error)) {
      return input.fallbackBikeId ?? null;
    }

    throw error;
  }

  if (!user) {
    return null;
  }

  if (
    user.selectedBike &&
    user.selectedBike.userId === input.userId &&
    !user.selectedBike.isArchived
  ) {
    return user.selectedBike.id;
  }

  const nextSelectedBikeId = input.fallbackBikeId ?? null;

  if (user.selectedBikeId !== nextSelectedBikeId) {
    try {
      await prisma.user.update({
        where: {
          id: input.userId,
        },
        data: {
          selectedBikeId: nextSelectedBikeId,
        },
      });
    } catch (error) {
      if (isSelectedBikeFieldUnavailable(error)) {
        return nextSelectedBikeId;
      }

      throw error;
    }
  }

  return nextSelectedBikeId;
}

export async function ensureUserBike(userId: string) {
  const existing = await getFirstOwnedBike(userId);

  if (existing) {
    await syncSelectedBikeIdForUser({
      userId,
      fallbackBikeId: existing.id,
    });
    return existing;
  }

  await syncSelectedBikeIdForUser({
    userId,
    fallbackBikeId: null,
  });
  return null;
}

export async function getOwnedBikes(input: {
  userId: string;
  includeArchived?: boolean;
}) {
  return prisma.bike.findMany({
    where: {
      userId: input.userId,
      isArchived: input.includeArchived ? undefined : false,
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
      isArchived: true,
    },
  });
}

export async function setSelectedBikeIdForUser(input: { userId: string; bikeId: string }) {
  const bike = await prisma.bike.findFirst({
    where: {
      id: input.bikeId,
      userId: input.userId,
      isArchived: false,
    },
    select: {
      id: true,
    },
  });

  if (!bike) {
    return null;
  }

  try {
    await prisma.user.update({
      where: {
        id: input.userId,
      },
      data: {
        selectedBikeId: bike.id,
      },
    });
  } catch (error) {
    if (!isSelectedBikeFieldUnavailable(error)) {
      throw error;
    }
  }

  return bike.id;
}

export async function getSelectedBikeIdForUser(input: { userId: string }) {
  const firstBike = await getFirstOwnedBike(input.userId);
  return syncSelectedBikeIdForUser({
    userId: input.userId,
    fallbackBikeId: firstBike?.id ?? null,
  });
}

export async function getOwnedBikeId(input: { userId: string; bikeId?: string }) {
  if (input.bikeId) {
    return setSelectedBikeIdForUser({
      userId: input.userId,
      bikeId: input.bikeId,
    });
  }

  return getSelectedBikeIdForUser({
    userId: input.userId,
  });
}

export async function isRideOwnedByUser(input: { rideId: string; userId: string }) {
  const ride = await prisma.ride.findFirst({
    where: {
      id: input.rideId,
      bike: {
        userId: input.userId,
      },
    },
    select: {
      id: true,
    },
  });

  return Boolean(ride);
}

export async function isComponentOwnedByUser(input: {
  componentId: string;
  userId: string;
}) {
  const component = await prisma.component.findFirst({
    where: {
      id: input.componentId,
      bike: {
        userId: input.userId,
      },
    },
    select: {
      id: true,
    },
  });

  return Boolean(component);
}
