import { ComponentStatus, type Component, type ComponentType } from "@prisma/client";

import { prisma } from "@/lib/db";

type BaseComponentInput = {
  name: string;
  brand?: string;
  model?: string;
  installDate?: Date;
  initialMileage?: number;
  replacementIntervalMiles?: number | null;
  notes?: string;
};

export type CreateComponentInput = BaseComponentInput & {
  bikeId: string;
  type: ComponentType;
  currentMileage?: number;
};

export type UpdateComponentInput = BaseComponentInput & {
  currentMileage?: number;
};

export type ReplaceComponentInput = Partial<BaseComponentInput> & {
  installDate?: Date;
};

export async function createComponent(input: CreateComponentInput): Promise<Component> {
  const initialMileage = input.initialMileage ?? input.currentMileage ?? 0;
  const currentMileage = input.currentMileage ?? initialMileage;

  return prisma.component.create({
    data: {
      bikeId: input.bikeId,
      type: input.type,
      name: input.name,
      brand: input.brand,
      model: input.model,
      installDate: input.installDate,
      initialMileage,
      currentMileage,
      replacementIntervalMiles: input.replacementIntervalMiles,
      notes: input.notes,
      status: ComponentStatus.ACTIVE,
      isActive: true,
    },
  });
}

export async function updateComponent(
  componentId: string,
  input: UpdateComponentInput,
): Promise<Component | null> {
  const existing = await prisma.component.findUnique({
    where: { id: componentId },
  });

  if (!existing) {
    return null;
  }

  return prisma.component.update({
    where: { id: componentId },
    data: {
      name: input.name,
      brand: input.brand,
      model: input.model,
      installDate: input.installDate,
      initialMileage: input.initialMileage,
      currentMileage: input.currentMileage,
      replacementIntervalMiles: input.replacementIntervalMiles,
      notes: input.notes,
    },
  });
}

export async function replaceComponent(
  componentId: string,
  input: ReplaceComponentInput,
): Promise<{ oldComponent: Component; newComponent: Component } | null> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.component.findUnique({
      where: { id: componentId },
    });

    if (!existing || !existing.isActive) {
      return null;
    }

    const oldComponent = await tx.component.update({
      where: { id: componentId },
      data: {
        status: ComponentStatus.REPLACED,
        isActive: false,
      },
    });

    const newComponent = await tx.component.create({
      data: {
        bikeId: existing.bikeId,
        type: existing.type,
        name: input.name ?? existing.name,
        brand: input.brand ?? existing.brand ?? undefined,
        model: input.model ?? existing.model ?? undefined,
        installDate: input.installDate ?? new Date(),
        initialMileage: input.initialMileage ?? 0,
        currentMileage: 0,
        replacementIntervalMiles:
          input.replacementIntervalMiles ?? existing.replacementIntervalMiles ?? undefined,
        status: ComponentStatus.ACTIVE,
        isActive: true,
        notes: input.notes ?? existing.notes ?? undefined,
      },
    });

    return {
      oldComponent,
      newComponent,
    };
  });
}
