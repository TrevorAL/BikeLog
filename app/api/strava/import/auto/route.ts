import { NextResponse } from "next/server";
import { StravaSyncStatus } from "@prisma/client";

import { requireApiUser } from "@/lib/auth";
import { getOwnedBikeId } from "@/lib/ownership";
import { autoSyncStravaForUser } from "@/lib/strava-auto-sync";

function optionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) {
    return auth.response;
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
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

    const result = await autoSyncStravaForUser({
      userId: auth.user.id,
      bikeId,
    });
    const firstBike = result.bikes[0];
    const responseBody = {
      importedCount: result.importedCount,
      skippedCount: result.skippedCount,
      errorCount: result.errorCount,
      matchedBike: firstBike?.matchedBike ?? null,
      message: firstBike?.message,
      errors: firstBike?.errors ?? [],
      sync: {
        status: result.status,
        lastSyncAt: result.lastSyncAt,
        lastSyncImportedCount: result.lastSyncImportedCount,
        lastSyncError: result.lastSyncError,
      },
    };

    if (result.status === StravaSyncStatus.ERROR) {
      return NextResponse.json(
        {
          ...responseBody,
          error: result.lastSyncError ?? "Could not auto-import Strava rides right now.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("Failed auto Strava import by bike name", error);

    return NextResponse.json(
      {
        error: "Could not auto-import Strava rides right now.",
      },
      { status: 500 },
    );
  }
}
