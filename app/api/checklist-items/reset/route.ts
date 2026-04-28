import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { resetChecklist } from "@/lib/checklist-service";

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

    await resetChecklist({ bikeId });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to reset checklist", error);
    return NextResponse.json(
      { error: "Could not reset checklist right now." },
      { status: 500 },
    );
  }
}
