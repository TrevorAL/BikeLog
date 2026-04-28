import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { resetChecklist } from "@/lib/checklist-service";
import { getOwnedBikeId } from "@/lib/ownership";

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
