import { MaintenanceEventType } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOwnedBikeId } from "@/lib/ownership";

const validMaintenanceTypes = new Set(Object.values(MaintenanceEventType));

function optionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const body = (await request.json()) as Record<string, unknown>;

    const dateInput = optionalString(body.date);

    if (!dateInput) {
      return NextResponse.json({ error: "Date is required." }, { status: 400 });
    }

    const date = new Date(dateInput);

    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: "Date is invalid." }, { status: 400 });
    }

    const typeInput = optionalString(body.type);
    const type =
      typeInput && validMaintenanceTypes.has(typeInput as MaintenanceEventType)
        ? (typeInput as MaintenanceEventType)
        : MaintenanceEventType.OTHER;

    const bikeIdInput = optionalString(body.bikeId);
    const bikeId = await getOwnedBikeId({
      userId: auth.user.id,
      bikeId: bikeIdInput,
    });

    if (!bikeId) {
      return NextResponse.json(
        {
          error: bikeIdInput
            ? "Bike not found for current user."
            : "No bike found for current user.",
        },
        { status: bikeIdInput ? 403 : 404 },
      );
    }

    const mileageSourceInput = optionalString(body.mileageSource);
    const mileageSource = mileageSourceInput === "component" ? "component" : "manual";

    const componentIdInput = optionalString(body.componentId);
    let componentId: string | undefined;
    let componentCurrentMileage: number | undefined;

    if (componentIdInput) {
      const component = await prisma.component.findFirst({
        where: {
          id: componentIdInput,
          bikeId,
        },
        select: {
          id: true,
          currentMileage: true,
        },
      });

      componentId = component?.id;
      componentCurrentMileage = component?.currentMileage;
    }

    const mileageInput = body.mileageAtService;
    const mileageAtServiceManual =
      mileageInput === "" || mileageInput === undefined || mileageInput === null
        ? undefined
        : Number(mileageInput);

    if (
      mileageAtServiceManual !== undefined &&
      (!Number.isFinite(mileageAtServiceManual) || mileageAtServiceManual < 0)
    ) {
      return NextResponse.json(
        { error: "Mileage at service must be a positive number." },
        { status: 400 },
      );
    }

    if (mileageSource === "component" && componentCurrentMileage === undefined) {
      return NextResponse.json(
        { error: "Select a valid component to use component mileage." },
        { status: 400 },
      );
    }

    const mileageAtService =
      mileageSource === "component" ? componentCurrentMileage : mileageAtServiceManual;

    const maintenanceEvent = await prisma.maintenanceEvent.create({
      data: {
        bikeId,
        componentId,
        type,
        date,
        mileageAtService,
        notes: optionalString(body.notes),
      },
      include: {
        component: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      maintenanceEvent,
    });
  } catch (error) {
    console.error("Failed to create maintenance event", error);
    return NextResponse.json(
      {
        error: "Could not create maintenance event right now.",
      },
      { status: 500 },
    );
  }
}
