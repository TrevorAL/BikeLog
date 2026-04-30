import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import {
  dispatchMaintenanceNotificationsForUser,
  getNotificationBellStateForUser,
} from "@/lib/notifications";

function shouldDispatchFromRequest(request: Request) {
  const url = new URL(request.url);
  const value = url.searchParams.get("dispatch")?.toLowerCase();
  return value === "1" || value === "true";
}

export async function GET(request: Request) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const dispatchSummary = shouldDispatchFromRequest(request)
      ? await dispatchMaintenanceNotificationsForUser(auth.user.id)
      : null;
    const state = await getNotificationBellStateForUser(auth.user.id);

    return NextResponse.json({
      state,
      dispatch: dispatchSummary,
    });
  } catch (error) {
    console.error("Failed to load notification state", error);
    return NextResponse.json(
      { error: "Could not load notification state right now." },
      { status: 500 },
    );
  }
}
