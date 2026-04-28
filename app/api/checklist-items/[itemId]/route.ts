import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { deleteChecklistItem, updateChecklistItem } from "@/lib/checklist-service";
import { prisma } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    itemId: string;
  }>;
};

function optionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const { itemId } = await context.params;
    const existing = await prisma.checklistItem.findFirst({
      where: {
        id: itemId,
        bike: {
          userId: auth.user.id,
        },
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Checklist item not found." }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    const label = optionalString(body.label);
    const completed =
      body.completed === undefined ? undefined : Boolean(body.completed);

    if (label === undefined && completed === undefined) {
      return NextResponse.json(
        { error: "No checklist fields provided." },
        { status: 400 },
      );
    }

    const item = await updateChecklistItem({
      itemId,
      label,
      completed,
    });

    if (!item) {
      return NextResponse.json({ error: "Checklist item not found." }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Failed to update checklist item", error);
    return NextResponse.json(
      { error: "Could not update checklist item right now." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const auth = await requireApiUser(_request);
    if ("response" in auth) {
      return auth.response;
    }

    const { itemId } = await context.params;
    const existing = await prisma.checklistItem.findFirst({
      where: {
        id: itemId,
        bike: {
          userId: auth.user.id,
        },
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Checklist item not found." }, { status: 404 });
    }

    const result = await deleteChecklistItem({ itemId });

    if (!result.deleted) {
      if (result.reason === "NOT_FOUND") {
        return NextResponse.json({ error: "Checklist item not found." }, { status: 404 });
      }
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Failed to delete checklist item", error);
    return NextResponse.json(
      { error: "Could not delete checklist item right now." },
      { status: 500 },
    );
  }
}
