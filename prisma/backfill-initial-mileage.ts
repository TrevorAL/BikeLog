import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function roundMileage(value: number) {
  return Math.round(value * 10) / 10;
}

async function main() {
  const candidates = await prisma.component.findMany({
    where: {
      initialMileage: 0,
      currentMileage: {
        gt: 0,
      },
    },
    select: {
      id: true,
      bikeId: true,
      name: true,
      installDate: true,
      initialMileage: true,
      currentMileage: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (candidates.length === 0) {
    console.log("No components require initial mileage backfill.");
    return;
  }

  let updatedCount = 0;
  let unchangedCount = 0;

  for (const component of candidates) {
    const rides = await prisma.ride.findMany({
      where: {
        bikeId: component.bikeId,
        ...(component.installDate
          ? {
              date: {
                gte: component.installDate,
              },
            }
          : {}),
      },
      select: {
        distanceMiles: true,
      },
    });

    const ridesMileage = roundMileage(
      rides.reduce((total, ride) => total + ride.distanceMiles, 0),
    );

    const inferredInitialMileage = Math.max(
      0,
      roundMileage(component.currentMileage - ridesMileage),
    );

    if (inferredInitialMileage === component.initialMileage) {
      unchangedCount += 1;
      continue;
    }

    await prisma.component.update({
      where: {
        id: component.id,
      },
      data: {
        initialMileage: inferredInitialMileage,
      },
    });

    updatedCount += 1;
    console.log(
      `Updated ${component.name}: initialMileage 0 -> ${inferredInitialMileage.toFixed(1)} (current ${component.currentMileage.toFixed(1)}, rides ${ridesMileage.toFixed(1)})`,
    );
  }

  console.log(
    `Initial mileage backfill complete. Updated ${updatedCount} component(s), unchanged ${unchangedCount}.`,
  );
}

main()
  .catch((error) => {
    console.error("Initial mileage backfill failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

