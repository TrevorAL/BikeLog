import { NextResponse } from "next/server";

import { dispatchMaintenanceNotificationsForAllUsers } from "@/lib/notifications";

export const dynamic = "force-dynamic";

function isAuthorizedCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization");

  if (!cronSecret) {
    return false;
  }

  return authorization === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized cron invocation." },
      { status: 401 },
    );
  }

  try {
    const summary = await dispatchMaintenanceNotificationsForAllUsers();
    return NextResponse.json({
      ok: true,
      summary,
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to run daily notification cron dispatch", error);
    return NextResponse.json(
      { error: "Could not dispatch notifications right now." },
      { status: 500 },
    );
  }
}
