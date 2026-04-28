import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { getOwnedBikeId } from "@/lib/ownership";
import { recalculateComponentMileageFromRides } from "@/lib/mileage-recalculation";

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

    let body: Record<string, unknown> = {};

    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

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

    const apply = body.apply === true;
    const result = await recalculateComponentMileageFromRides({
      bikeId,
      apply,
    });

    if (!result) {
      return NextResponse.json({ error: "Bike not found." }, { status: 404 });
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Failed to recalculate component mileage", error);
    return NextResponse.json(
      { error: "Could not recalculate mileage right now." },
      { status: 500 },
    );
  }
}
