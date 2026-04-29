import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const deleted = await prisma.stravaConnection.deleteMany({
      where: {
        userId: auth.user.id,
      },
    });

    return NextResponse.json({
      disconnected: deleted.count > 0,
    });
  } catch (error) {
    console.error("Failed to disconnect Strava", error);
    return NextResponse.json(
      {
        error: "Could not disconnect Strava right now.",
      },
      { status: 500 },
    );
  }
}
