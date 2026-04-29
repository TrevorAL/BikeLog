import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { setSelectedBikeIdForUser } from "@/lib/ownership";

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
    const bikeId = optionalString(body.bikeId);

    if (!bikeId) {
      return NextResponse.json(
        { error: "Bike id is required." },
        { status: 400 },
      );
    }

    const selectedBikeId = await setSelectedBikeIdForUser({
      userId: auth.user.id,
      bikeId,
    });

    if (!selectedBikeId) {
      return NextResponse.json(
        { error: "Bike not found for current user." },
        { status: 403 },
      );
    }

    return NextResponse.json({
      selectedBikeId,
    });
  } catch (error) {
    console.error("Failed to select bike", error);
    return NextResponse.json(
      { error: "Could not update selected bike right now." },
      { status: 500 },
    );
  }
}
