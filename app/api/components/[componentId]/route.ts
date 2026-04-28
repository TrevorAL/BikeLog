import { NextResponse } from "next/server";

import { updateComponent } from "@/lib/component-service";

type RouteContext = {
  params: Promise<{
    componentId: string;
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
    const { componentId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;

    const name = optionalString(body.name);

    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    const currentMileageInput = body.currentMileage;
    const currentMileage =
      currentMileageInput === "" || currentMileageInput === undefined || currentMileageInput === null
        ? undefined
        : Number(currentMileageInput);

    const initialMileageInput = body.initialMileage;
    const initialMileage =
      initialMileageInput === "" || initialMileageInput === undefined || initialMileageInput === null
        ? undefined
        : Number(initialMileageInput);

    if (
      currentMileage !== undefined &&
      (!Number.isFinite(currentMileage) || currentMileage < 0)
    ) {
      return NextResponse.json(
        { error: "Current mileage must be a positive number." },
        { status: 400 },
      );
    }

    if (
      initialMileage !== undefined &&
      (!Number.isFinite(initialMileage) || initialMileage < 0)
    ) {
      return NextResponse.json(
        { error: "Initial mileage must be a positive number." },
        { status: 400 },
      );
    }

    const installDateInput = optionalString(body.installDate);
    const installDate = installDateInput ? new Date(installDateInput) : undefined;

    if (installDate && Number.isNaN(installDate.getTime())) {
      return NextResponse.json({ error: "Install date is invalid." }, { status: 400 });
    }

    const component = await updateComponent(componentId, {
      name,
      brand: optionalString(body.brand),
      model: optionalString(body.model),
      installDate,
      initialMileage,
      currentMileage,
      notes: optionalString(body.notes),
    });

    if (!component) {
      return NextResponse.json({ error: "Component not found." }, { status: 404 });
    }

    return NextResponse.json({ component });
  } catch (error) {
    console.error("Failed to update component", error);
    return NextResponse.json(
      { error: "Could not update component right now." },
      { status: 500 },
    );
  }
}
