import { NextResponse } from "next/server";

import { createChecklistItem } from "@/lib/checklist-service";
import { prisma } from "@/lib/db";

function optionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    const label = optionalString(body.label);

    if (!label) {
      return NextResponse.json({ error: "Checklist label is required." }, { status: 400 });
    }

    const bikeIdInput = optionalString(body.bikeId);
    let bikeId = bikeIdInput;

    if (!bikeId) {
      const bike = await prisma.bike.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      bikeId = bike?.id;
    }

    if (!bikeId) {
      return NextResponse.json(
        { error: "No bike found. Seed the database first with `npm run db:seed`." },
        { status: 404 },
      );
    }

    const item = await createChecklistItem({
      bikeId,
      label,
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Failed to create checklist item", error);
    return NextResponse.json(
      { error: "Could not create checklist item right now." },
      { status: 500 },
    );
  }
}
