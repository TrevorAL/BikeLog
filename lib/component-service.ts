import { ComponentStatus, type Component, type ComponentType } from "@prisma/client";

import { prisma } from "@/lib/db";

type BaseComponentInput = {
  name: string;
  brand?: string;
  model?: string;
  installDate?: Date;
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
  return prisma.component.create({
    data: {
      bikeId: input.bikeId,
      type: input.type,
      name: input.name,
      brand: input.brand,
      model: input.model,
      installDate: input.installDate,
      currentMileage: input.currentMileage ?? 0,
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
      currentMileage: input.currentMileage,
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
        currentMileage: 0,
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
