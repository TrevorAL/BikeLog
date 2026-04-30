import type { FitMeasurement } from "@prisma/client";

import { prisma } from "@/lib/db";

export type FitMeasurementInput = {
  bikeId: string;
  date: Date;
  saddleHeightMm?: number;
  saddleSetbackMm?: number;
  saddleTiltDeg?: number;
  stemLengthMm?: number;
  handlebarWidthMm?: number;
  crankLengthMm?: number;
  spacerStackMm?: number;
  reachToHoodsMm?: number;
  cleatNotes?: string;
  notes?: string;
  isCurrent?: boolean;
};

export type UpdateFitMeasurementInput = Omit<FitMeasurementInput, "bikeId">;

export async function createFitMeasurement(
  input: FitMeasurementInput,
): Promise<FitMeasurement> {
  return prisma.$transaction(async (tx) => {
    if (input.isCurrent) {
      await tx.fitMeasurement.updateMany({
        where: {
          bikeId: input.bikeId,
        },
        data: {
          isCurrent: false,
        },
      });
    }

    return tx.fitMeasurement.create({
      data: {
        bikeId: input.bikeId,
        date: input.date,
        saddleHeightMm: input.saddleHeightMm,
        saddleSetbackMm: input.saddleSetbackMm,
        saddleTiltDeg: input.saddleTiltDeg,
        stemLengthMm: input.stemLengthMm,
        handlebarWidthMm: input.handlebarWidthMm,
        crankLengthMm: input.crankLengthMm,
        spacerStackMm: input.spacerStackMm,
        reachToHoodsMm: input.reachToHoodsMm,
        cleatNotes: input.cleatNotes,
        notes: input.notes,
        isCurrent: Boolean(input.isCurrent),
      },
    });
  });
}

export async function updateFitMeasurement(
  measurementId: string,
  input: UpdateFitMeasurementInput,
): Promise<FitMeasurement | null> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.fitMeasurement.findUnique({
      where: {
        id: measurementId,
      },
      select: {
        id: true,
        bikeId: true,
      },
    });

    if (!existing) {
      return null;
    }

    if (input.isCurrent) {
      await tx.fitMeasurement.updateMany({
        where: {
          bikeId: existing.bikeId,
        },
        data: {
          isCurrent: false,
        },
      });
    }

    return tx.fitMeasurement.update({
      where: {
        id: measurementId,
      },
      data: {
        date: input.date,
        saddleHeightMm: input.saddleHeightMm,
        saddleSetbackMm: input.saddleSetbackMm,
        saddleTiltDeg: input.saddleTiltDeg,
        stemLengthMm: input.stemLengthMm,
        handlebarWidthMm: input.handlebarWidthMm,
        crankLengthMm: input.crankLengthMm,
        spacerStackMm: input.spacerStackMm,
        reachToHoodsMm: input.reachToHoodsMm,
        cleatNotes: input.cleatNotes,
        notes: input.notes,
        ...(input.isCurrent ? { isCurrent: true } : {}),
      },
    });
  });
}

export async function markFitMeasurementCurrent(
  measurementId: string,
): Promise<FitMeasurement | null> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.fitMeasurement.findUnique({
      where: { id: measurementId },
      select: { id: true, bikeId: true },
    });

    if (!existing) {
      return null;
    }

    await tx.fitMeasurement.updateMany({
      where: {
        bikeId: existing.bikeId,
      },
      data: {
        isCurrent: false,
      },
    });

    return tx.fitMeasurement.update({
      where: { id: measurementId },
      data: {
        isCurrent: true,
      },
    });
  });
}

export async function deleteFitMeasurement(
  measurementId: string,
): Promise<FitMeasurement | null> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.fitMeasurement.findUnique({
      where: { id: measurementId },
      select: { id: true, bikeId: true, isCurrent: true },
    });

    if (!existing) {
      return null;
    }

    const deleted = await tx.fitMeasurement.delete({
      where: {
        id: measurementId,
      },
    });

    if (existing.isCurrent) {
      const nextCurrent = await tx.fitMeasurement.findFirst({
        where: {
          bikeId: existing.bikeId,
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
        },
      });

      if (nextCurrent) {
        await tx.fitMeasurement.update({
          where: {
            id: nextCurrent.id,
          },
          data: {
            isCurrent: true,
          },
        });
      }
    }

    return deleted;
  });
}
