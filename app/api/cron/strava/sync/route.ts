import { NextResponse } from "next/server";

import { dispatchStravaSyncForConnectedUsers } from "@/lib/strava-auto-sync";

export const dynamic = "force-dynamic";

function isAuthorizedCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization");

  if (!cronSecret) {
    return false;
  }

  return authorization === `Bearer ${cronSecret}`;
}

function shouldRunRetryOnly(request: Request) {
  const url = new URL(request.url);
  const retryOnly = url.searchParams.get("retryOnly")?.toLowerCase();
  return retryOnly === "1" || retryOnly === "true";
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized cron invocation." },
      { status: 401 },
    );
  }

  try {
    const retryOnly = shouldRunRetryOnly(request);
    const summary = await dispatchStravaSyncForConnectedUsers({
      retryOnly,
    });

    return NextResponse.json({
      ok: true,
      mode: retryOnly ? "retry" : "sync",
      summary,
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to run scheduled Strava sync", error);
    return NextResponse.json(
      { error: "Could not dispatch Strava sync right now." },
      { status: 500 },
    );
  }
}
