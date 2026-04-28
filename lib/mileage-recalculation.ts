import {
  ComponentStatus,
  MaintenanceEventType,
  type ComponentType,
} from "@prisma/client";

import { MILEAGE_BASED_COMPONENT_TYPES } from "@/lib/constants";
import { prisma } from "@/lib/db";

const mileageBasedComponentTypes = MILEAGE_BASED_COMPONENT_TYPES as unknown as ComponentType[];

function roundMileage(value: number) {
  return Math.round(value * 10) / 10;
}

export type MileageRecalculationItem = {
  componentId: string;
  componentName: string;
  componentType: string;
  installDate: string | null;
  currentMileage: number;
  expectedMileage: number;
  deltaMileage: number;
  ridesUsed: number;
  willChange: boolean;
};

export type MileageRecalculationResult = {
  bikeId: string;
  bikeName: string;
  apply: boolean;
  rideCount: number;
  totalRideMiles: number;
  checkedComponentCount: number;
  changedComponentCount: number;
  items: MileageRecalculationItem[];
  auditEventId?: string;
};

function calculateExpectedMileage(input: {
  rides: { date: Date; distanceMiles: number }[];
  installDate: Date | null;
  initialMileage: number;
}) {
  const relevantRides = input.installDate
    ? input.rides.filter((ride) => ride.date >= input.installDate!)
    : input.rides;

  const ridesMileage = relevantRides.reduce((total, ride) => total + ride.distanceMiles, 0);
  const rawExpected = input.initialMileage + ridesMileage;

  return {
    expectedMileage: roundMileage(rawExpected),
    ridesUsed: relevantRides.length,
  };
}

export async function recalculateComponentMileageFromRides(input: {
  bikeId: string;
  apply: boolean;
}): Promise<MileageRecalculationResult | null> {
  const bike = await prisma.bike.findUnique({
    where: {
      id: input.bikeId,
    },
    select: {
      id: true,
      name: true,
      rides: {
        select: {
          date: true,
          distanceMiles: true,
        },
      },
      components: {
        where: {
          isActive: true,
          status: ComponentStatus.ACTIVE,
          type: {
            in: mileageBasedComponentTypes,
          },
        },
        select: {
          id: true,
          name: true,
          type: true,
          installDate: true,
          initialMileage: true,
          currentMileage: true,
        },
      },
    },
  });

  if (!bike) {
    return null;
  }

  const items: MileageRecalculationItem[] = bike.components.map((component) => {
    const { expectedMileage, ridesUsed } = calculateExpectedMileage({
      rides: bike.rides,
      installDate: component.installDate,
      initialMileage: component.initialMileage,
    });
    const currentMileage = roundMileage(component.currentMileage);
    const deltaMileage = roundMileage(expectedMileage - currentMileage);
    const willChange = Math.abs(deltaMileage) > 0;

    return {
      componentId: component.id,
      componentName: component.name,
      componentType: component.type,
      installDate: component.installDate?.toISOString() ?? null,
      currentMileage,
      expectedMileage,
      deltaMileage,
      ridesUsed,
      willChange,
    };
  });

  const totalRideMiles = roundMileage(
    bike.rides.reduce((total, ride) => total + ride.distanceMiles, 0),
  );
  const changedItems = items.filter((item) => item.willChange);

  let auditEventId: string | undefined;

  if (input.apply && changedItems.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const item of changedItems) {
        await tx.component.update({
          where: {
            id: item.componentId,
          },
          data: {
            currentMileage: item.expectedMileage,
          },
        });
      }

      const auditEvent = await tx.maintenanceEvent.create({
        data: {
          bikeId: bike.id,
          type: MaintenanceEventType.OTHER,
          date: new Date(),
          notes: `Mileage recalculation applied from rides. Updated ${changedItems.length} component(s).`,
        },
        select: {
          id: true,
        },
      });

      auditEventId = auditEvent.id;
    });
  }

  return {
    bikeId: bike.id,
    bikeName: bike.name,
    apply: input.apply,
    rideCount: bike.rides.length,
    totalRideMiles,
    checkedComponentCount: items.length,
    changedComponentCount: changedItems.length,
    items,
    auditEventId,
  };
}
