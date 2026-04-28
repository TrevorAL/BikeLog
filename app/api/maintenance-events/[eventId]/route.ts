import { MaintenanceEventType } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

const validMaintenanceTypes = new Set(Object.values(MaintenanceEventType));

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

    const { eventId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;

    const existingEvent = await prisma.maintenanceEvent.findFirst({
      where: {
        id: eventId,
        bike: {
          userId: auth.user.id,
        },
      },
      select: {
        id: true,
        bikeId: true,
      },
    });

    if (!existingEvent) {
      return NextResponse.json(
        { error: "Maintenance event not found." },
        { status: 404 },
      );
    }

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

    const mileageSourceInput = optionalString(body.mileageSource);
    const mileageSource = mileageSourceInput === "component" ? "component" : "manual";

    const componentIdInput = optionalString(body.componentId);
    let componentId: string | undefined;
    let componentCurrentMileage: number | undefined;

    if (componentIdInput) {
      const component = await prisma.component.findFirst({
        where: {
          id: componentIdInput,
          bikeId: existingEvent.bikeId,
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

    const maintenanceEvent = await prisma.maintenanceEvent.update({
      where: {
        id: eventId,
      },
      data: {
        date,
        type,
        componentId,
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

    return NextResponse.json({ maintenanceEvent });
  } catch (error) {
    console.error("Failed to update maintenance event", error);
    return NextResponse.json(
      { error: "Could not update maintenance event right now." },
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

    const { eventId } = await context.params;

    const existingEvent = await prisma.maintenanceEvent.findFirst({
      where: {
        id: eventId,
        bike: {
          userId: auth.user.id,
        },
      },
      select: {
        id: true,
      },
    });

    if (!existingEvent) {
      return NextResponse.json(
        { error: "Maintenance event not found." },
        { status: 404 },
      );
    }

    await prisma.maintenanceEvent.delete({
      where: {
        id: eventId,
      },
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Failed to delete maintenance event", error);
    return NextResponse.json(
      { error: "Could not delete maintenance event right now." },
      { status: 500 },
    );
  }
}
