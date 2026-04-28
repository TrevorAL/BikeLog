import { type ComponentType } from "@prisma/client";
import { NextResponse } from "next/server";

import { COMPONENT_TYPES, DEFAULT_COMPONENT_NAME_BY_TYPE } from "@/lib/component-options";
import { createComponent } from "@/lib/component-service";
import { prisma } from "@/lib/db";

const validComponentTypes = new Set(COMPONENT_TYPES);

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

    const typeInput = optionalString(body.type);

    if (!typeInput || !validComponentTypes.has(typeInput as (typeof COMPONENT_TYPES)[number])) {
      return NextResponse.json({ error: "Component type is invalid." }, { status: 400 });
    }

    const currentMileageInput = body.currentMileage;
    const currentMileage =
      currentMileageInput === "" || currentMileageInput === undefined || currentMileageInput === null
        ? undefined
        : Number(currentMileageInput);

    if (
      currentMileage !== undefined &&
      (!Number.isFinite(currentMileage) || currentMileage < 0)
    ) {
      return NextResponse.json(
        { error: "Current mileage must be a positive number." },
        { status: 400 },
      );
    }

    const defaultName = DEFAULT_COMPONENT_NAME_BY_TYPE[typeInput] ?? "Component";
    const name = optionalString(body.name) ?? defaultName;

    const component = await createComponent({
      bikeId,
      type: typeInput as ComponentType,
      name,
      brand: optionalString(body.brand),
      model: optionalString(body.model),
      installDate: optionalString(body.installDate)
        ? new Date(optionalString(body.installDate) as string)
        : undefined,
      currentMileage,
      notes: optionalString(body.notes),
    });

    return NextResponse.json({ component });
  } catch (error) {
    console.error("Failed to create component", error);
    return NextResponse.json(
      { error: "Could not create component right now." },
      { status: 500 },
    );
  }
}
