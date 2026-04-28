import {
  ComponentStatus,
  type ComponentType,
  MaintenanceEventType,
  PrismaClient,
  RideType,
} from "@prisma/client";

import {
  seedBike,
  seedChecklistItems,
  seedComponents,
  seedPressurePresets,
} from "../lib/seed";

const prisma = new PrismaClient();

async function main() {
  await prisma.maintenanceEvent.deleteMany();
  await prisma.ride.deleteMany();
  await prisma.fitMeasurement.deleteMany();
  await prisma.tirePressureSetup.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.component.deleteMany();
  await prisma.bike.deleteMany();

  const bike = await prisma.bike.create({
    data: {
      ...seedBike,
      frameSize: "M/L",
    },
  });

  await prisma.component.createMany({
    data: seedComponents.map((component) => ({
      bikeId: bike.id,
      type: component.type as ComponentType,
      name: component.name,
      brand: component.brand,
      model: component.model,
      installDate: component.installDate,
      currentMileage: component.currentMileage,
      status: ComponentStatus.ACTIVE,
      isActive: true,
    })),
  });

  await prisma.checklistItem.createMany({
    data: seedChecklistItems.map((item) => ({
      bikeId: bike.id,
      label: item.label,
      sortOrder: item.sortOrder,
      isDefault: item.isDefault,
      completed: false,
    })),
  });

  await prisma.tirePressureSetup.createMany({
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

  await prisma.fitMeasurement.create({
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

  await prisma.ride.createMany({
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

  const chainComponent = await prisma.component.findFirst({
    where: {
      bikeId: bike.id,
      type: "CHAIN",
    },
  });

  await prisma.maintenanceEvent.createMany({
    data: [
      {
        bikeId: bike.id,
        componentId: chainComponent?.id,
        type: MaintenanceEventType.LUBED_CHAIN,
        date: new Date("2026-04-23"),
        mileageAtService: 320,
        notes: "Dry lube after rainy commute.",
      },
      {
        bikeId: bike.id,
        type: MaintenanceEventType.CHARGED_DI2,
        date: new Date("2026-03-30"),
        mileageAtService: 240,
        notes: "Full recharge.",
      },
    ],
  });

  console.log("Seed complete for BikeLog MVP");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
