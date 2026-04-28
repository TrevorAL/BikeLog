import { ComponentStatus, type ComponentType, type Ride, RideType } from "@prisma/client";

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

const mileageBasedComponentTypes = MILEAGE_BASED_COMPONENT_TYPES as unknown as ComponentType[];

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

    await tx.component.updateMany({
      where: {
        bikeId: input.bikeId,
        isActive: true,
        status: ComponentStatus.ACTIVE,
        type: {
          in: mileageBasedComponentTypes,
        },
      },
      data: {
        currentMileage: {
          increment: input.distanceMiles,
        },
      },
    });

    // TODO: If rides become editable/deletable, recalculate component mileage from ride history.
    return ride;
  });
}
