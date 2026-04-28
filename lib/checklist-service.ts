import type { ChecklistItem } from "@prisma/client";

import { prisma } from "@/lib/db";

export async function createChecklistItem(input: {
  bikeId: string;
  label: string;
}): Promise<ChecklistItem> {
  const maxSortOrder = await prisma.checklistItem.aggregate({
    where: {
      bikeId: input.bikeId,
    },
    _max: {
      sortOrder: true,
    },
  });

  const nextSortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

  return prisma.checklistItem.create({
    data: {
      bikeId: input.bikeId,
      label: input.label,
      completed: false,
      sortOrder: nextSortOrder,
      isDefault: false,
    },
  });
}

export async function updateChecklistItem(input: {
  itemId: string;
  completed?: boolean;
  label?: string;
}): Promise<ChecklistItem | null> {
  const existing = await prisma.checklistItem.findUnique({
    where: {
      id: input.itemId,
    },
  });

  if (!existing) {
    return null;
  }

  return prisma.checklistItem.update({
    where: {
      id: input.itemId,
    },
    data: {
      ...(input.completed === undefined ? {} : { completed: input.completed }),
      ...(input.label === undefined ? {} : { label: input.label }),
    },
  });
}

export async function resetChecklist(input: { bikeId: string }) {
  await prisma.checklistItem.updateMany({
    where: {
      bikeId: input.bikeId,
    },
    data: {
      completed: false,
    },
  });
}

export async function deleteChecklistItem(input: {
  itemId: string;
}): Promise<{ deleted: boolean; reason?: string }> {
  const existing = await prisma.checklistItem.findUnique({
    where: {
      id: input.itemId,
    },
  });

  if (!existing) {
    return { deleted: false, reason: "NOT_FOUND" };
  }

  if (existing.isDefault) {
    return { deleted: false, reason: "DEFAULT_ITEM" };
  }

  await prisma.checklistItem.delete({
    where: {
      id: input.itemId,
    },
  });

  return { deleted: true };
}
