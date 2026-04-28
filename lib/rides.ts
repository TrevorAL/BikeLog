import {
  ComponentStatus,
  Prisma,
  type ComponentType,
  type Ride,
  RideType,
} from "@prisma/client";

import { MILEAGE_BASED_COMPONENT_TYPES } from "@/lib/constants";
import { prisma } from "@/lib/db";

export type CreateRideInput = {
  bikeId: string;
  date: Date;
  distanceMiles: number;
  durationMinutes?: number;
  rideType: RideType;
  weather?: string;
  roadCondition?: string;
  wasWet: boolean;
  notes?: string;
};

export type UpdateRideInput = {
  date: Date;
  distanceMiles: number;
  durationMinutes?: number;
  rideType: RideType;
  weather?: string;
  roadCondition?: string;
  wasWet: boolean;
  notes?: string;
};

const mileageBasedComponentTypes = MILEAGE_BASED_COMPONENT_TYPES as unknown as ComponentType[];

async function adjustActiveComponentMileage(
  tx: Prisma.TransactionClient,
  bikeId: string,
  mileageDelta: number,
) {
  if (mileageDelta === 0) {
    return;
  }

  if (mileageDelta > 0) {
    await tx.component.updateMany({
      where: {
        bikeId,
        isActive: true,
        status: ComponentStatus.ACTIVE,
        type: {
          in: mileageBasedComponentTypes,
        },
      },
      data: {
        currentMileage: {
          increment: mileageDelta,
        },
      },
    });

    return;
  }

  const activeComponents = await tx.component.findMany({
    where: {
      bikeId,
      isActive: true,
      status: ComponentStatus.ACTIVE,
      type: {
        in: mileageBasedComponentTypes,
      },
    },
    select: {
      id: true,
      currentMileage: true,
    },
  });

  for (const component of activeComponents) {
    await tx.component.update({
      where: { id: component.id },
      data: {
        currentMileage: Math.max(0, component.currentMileage + mileageDelta),
      },
    });
  }
}

export function getRideConditionSuggestions(input: {
  wasWet: boolean;
  roadCondition?: string;
}) {
  const suggestions: string[] = [];

  if (input.wasWet) {
    suggestions.push("Recent wet ride: clean and lube chain.");
  }

  if (input.roadCondition === "Rough" || input.roadCondition === "Very Rough") {
    suggestions.push("Recent rough ride: inspect tires and wheels.");
  }

  return suggestions;
}

export async function createRideAndUpdateMileage(input: CreateRideInput): Promise<Ride> {
  return prisma.$transaction(async (tx) => {
    const ride = await tx.ride.create({
      data: {
        bikeId: input.bikeId,
        date: input.date,
        distanceMiles: input.distanceMiles,
        durationMinutes: input.durationMinutes,
        rideType: input.rideType,
        weather: input.weather,
        roadCondition: input.roadCondition,
        wasWet: input.wasWet,
        notes: input.notes,
      },
    });

    await adjustActiveComponentMileage(tx, input.bikeId, input.distanceMiles);
    return ride;
  });
}

export async function updateRideAndAdjustMileage(
  rideId: string,
  input: UpdateRideInput,
): Promise<Ride | null> {
  return prisma.$transaction(async (tx) => {
    const existingRide = await tx.ride.findUnique({
      where: { id: rideId },
    });

    if (!existingRide) {
      return null;
    }

    const updatedRide = await tx.ride.update({
      where: { id: rideId },
      data: {
        date: input.date,
        distanceMiles: input.distanceMiles,
        durationMinutes: input.durationMinutes,
        rideType: input.rideType,
        weather: input.weather,
        roadCondition: input.roadCondition,
        wasWet: input.wasWet,
        notes: input.notes,
      },
    });

    const mileageDelta = input.distanceMiles - existingRide.distanceMiles;
    await adjustActiveComponentMileage(tx, existingRide.bikeId, mileageDelta);

    return updatedRide;
  });
}

export async function deleteRideAndAdjustMileage(rideId: string): Promise<Ride | null> {
  return prisma.$transaction(async (tx) => {
    const existingRide = await tx.ride.findUnique({
      where: { id: rideId },
    });

    if (!existingRide) {
      return null;
    }

    await tx.ride.delete({
      where: { id: rideId },
    });

    await adjustActiveComponentMileage(tx, existingRide.bikeId, -existingRide.distanceMiles);

    return existingRide;
  });
}
