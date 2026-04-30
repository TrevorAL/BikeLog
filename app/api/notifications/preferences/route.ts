import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import {
  getNotificationPreferencesForUser,
  updateNotificationPreferencesForUser,
} from "@/lib/notifications";

function parseOptionalBoolean(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new Error("Invalid boolean value.");
  }

  return value;
}

function parseOptionalStringOrNull(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("Invalid text value.");
  }

  return value;
}

function parseBikePreferences(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error("Bike preferences must be an array.");
  }

  return value.map((entry) => {
    if (!entry || typeof entry !== "object") {
      throw new Error("Bike preference entry is invalid.");
    }

    const record = entry as Record<string, unknown>;
    const bikeId = typeof record.bikeId === "string" ? record.bikeId.trim() : "";
    if (!bikeId) {
      throw new Error("Bike preference bikeId is required.");
    }

    return {
      bikeId,
      enabled: parseOptionalBoolean(record.enabled),
      emailEnabled: parseOptionalBoolean(record.emailEnabled),
      smsEnabled: parseOptionalBoolean(record.smsEnabled),
    };
  });
}

export async function GET(request: Request) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const preferences = await getNotificationPreferencesForUser(auth.user.id);
    return NextResponse.json({ preferences });
  } catch (error) {
    console.error("Failed to load notification preferences", error);
    return NextResponse.json(
      { error: "Could not load notification preferences right now." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const preferences = await updateNotificationPreferencesForUser(auth.user.id, {
      notificationsEnabled: parseOptionalBoolean(body.notificationsEnabled),
      emailEnabled: parseOptionalBoolean(body.emailEnabled),
      smsEnabled: parseOptionalBoolean(body.smsEnabled),
      phoneNumber: parseOptionalStringOrNull(body.phoneNumber),
      bikePreferences: parseBikePreferences(body.bikePreferences),
    });

    return NextResponse.json({ preferences });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Failed to update notification preferences", error);
    return NextResponse.json(
      { error: "Could not update notification preferences right now." },
      { status: 500 },
    );
  }
}
