import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import {
  fetchStravaActivityPreview,
  fetchStravaBikeOptions,
  getFreshStravaConnectionForUser,
  resolveStravaBikeOptions,
} from "@/lib/strava";

export async function GET(request: Request) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const connection = await getFreshStravaConnectionForUser(auth.user.id);
    if (!connection) {
      return NextResponse.json(
        {
          error: "Connect Strava before loading bikes.",
        },
        { status: 400 },
      );
    }

    const [baseOptions, preview] = await Promise.all([
      fetchStravaBikeOptions({
        userId: auth.user.id,
      }),
      fetchStravaActivityPreview({
        userId: auth.user.id,
        limit: 100,
      }),
    ]);

    const bikeOptions = await resolveStravaBikeOptions({
      userId: auth.user.id,
      baseOptions,
      previewActivities: preview,
    });

    return NextResponse.json({
      bikeOptions,
    });
  } catch (error) {
    console.error("Failed to load Strava bikes", error);
    return NextResponse.json(
      {
        error: "Could not load Strava bikes right now.",
      },
      { status: 500 },
    );
  }
}
