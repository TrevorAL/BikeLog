import {
  ComponentStatus,
  type ComponentType,
  type Prisma,
  RideType,
} from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  seedBike,
  seedChecklistItems,
  seedComponents,
  seedPressurePresets,
} from "@/lib/seed";

function createDefaultBikeData(userId: string): Prisma.BikeCreateInput {
  return {
    ...seedBike,
    frameSize: "M/L",
    user: {
      connect: {
        id: userId,
      },
    },
  };
}

async function createSeededBikeForUser(userId: string) {
  return prisma.$transaction(async (tx) => {
    const bike = await tx.bike.create({
      data: createDefaultBikeData(userId),
      select: {
        id: true,
      },
    });

    await tx.component.createMany({
      data: seedComponents.map((component) => ({
        bikeId: bike.id,
        type: component.type as ComponentType,
        name: component.name,
        brand: component.brand,
        model: component.model,
        installDate: component.installDate,
        initialMileage: component.currentMileage,
        currentMileage: component.currentMileage,
        status: ComponentStatus.ACTIVE,
        isActive: true,
      })),
    });

    await tx.checklistItem.createMany({
      data: seedChecklistItems.map((item) => ({
        bikeId: bike.id,
        label: item.label,
        sortOrder: item.sortOrder,
        isDefault: item.isDefault,
        completed: false,
      })),
    });

    await tx.tirePressureSetup.createMany({
      data: seedPressurePresets.map((preset) => ({
        bikeId: bike.id,
        name: preset.name,
        riderWeightLbs: preset.riderWeightLbs,
        bikeWeightLbs: preset.bikeWeightLbs,
        gearWeightLbs: preset.gearWeightLbs,
        frontTireWidthMm: preset.frontTireWidthMm,
        rearTireWidthMm: preset.rearTireWidthMm,
        tubeless: preset.tubeless,
        surface: preset.surface,
        preference: preset.preference,
        frontPsi: preset.frontPsi,
        rearPsi: preset.rearPsi,
      })),
    });

    await tx.fitMeasurement.create({
      data: {
        bikeId: bike.id,
        date: new Date("2026-04-12"),
        saddleHeightMm: 742,
        saddleSetbackMm: 58,
        saddleTiltDeg: -1,
        stemLengthMm: 110,
        handlebarWidthMm: 420,
        crankLengthMm: 172.5,
        spacerStackMm: 18,
        reachToHoodsMm: 495,
        cleatNotes: "Right cleat 1 mm aft",
        notes: "Stable for long rides.",
        isCurrent: true,
      },
    });

    await tx.ride.createMany({
      data: [
        {
          bikeId: bike.id,
          date: new Date("2026-04-25"),
          distanceMiles: 38.5,
          durationMinutes: 115,
          rideType: RideType.GROUP_RIDE,
          weather: "Cloudy, 58F",
          roadCondition: "Rough",
          wasWet: false,
          notes: "Fast town line loop with a rough final segment.",
        },
        {
          bikeId: bike.id,
          date: new Date("2026-04-22"),
          distanceMiles: 21.2,
          durationMinutes: 68,
          rideType: RideType.TRAINING,
          weather: "Light rain",
          roadCondition: "Wet",
          wasWet: true,
          notes: "Tempo intervals in drizzle.",
        },
      ],
    });

    const chain = await tx.component.findFirst({
      where: {
        bikeId: bike.id,
        type: "CHAIN",
      },
      select: {
        id: true,
      },
    });

    await tx.maintenanceEvent.createMany({
      data: [
        {
          bikeId: bike.id,
          componentId: chain?.id,
          type: "LUBED_CHAIN",
          date: new Date("2026-04-23"),
          mileageAtService: 320,
          notes: "Dry lube after rainy commute.",
        },
        {
          bikeId: bike.id,
          type: "CHARGED_DI2",
          date: new Date("2026-03-30"),
          mileageAtService: 240,
          notes: "Full recharge.",
        },
      ],
    });

    return bike;
  });
}

export async function ensureUserBike(userId: string) {
  const existing = await prisma.bike.findFirst({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    return existing;
  }

  const claimed = await prisma.bike.findFirst({
    where: {
      userId: null,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
    },
  });

  if (claimed) {
    const claimedUpdate = await prisma.bike.updateMany({
      where: {
        id: claimed.id,
        userId: null,
      },
      data: {
        userId,
      },
    });

    if (claimedUpdate.count === 1) {
      return {
        id: claimed.id,
      };
    }

    const maybeOwnedNow = await prisma.bike.findFirst({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
      },
    });

    if (maybeOwnedNow) {
      return maybeOwnedNow;
    }
  }

  return createSeededBikeForUser(userId);
}

export async function getOwnedBikeId(input: { userId: string; bikeId?: string }) {
  if (input.bikeId) {
    const bike = await prisma.bike.findFirst({
      where: {
        id: input.bikeId,
        userId: input.userId,
      },
      select: {
        id: true,
      },
    });

    return bike?.id ?? null;
  }

  const firstBike = await prisma.bike.findFirst({
    where: {
      userId: input.userId,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
    },
  });

  return firstBike?.id ?? null;
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
