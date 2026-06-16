import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    bikeId: string;
  }>;
};

async function getOwnedBike(bikeId: string, userId: string) {
  return prisma.bike.findFirst({
    where: { id: bikeId, userId },
    select: { id: true, shareToken: true, isShared: true },
  });
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) return auth.response;

    const { bikeId } = await context.params;
    const bike = await getOwnedBike(bikeId, auth.user.id);

    if (!bike) {
      return NextResponse.json({ error: "Bike not found." }, { status: 404 });
    }

    return NextResponse.json({ shareToken: bike.shareToken, isShared: bike.isShared });
  } catch (error) {
    console.error("Failed to get bike share state", error);
    return NextResponse.json({ error: "Could not get share state." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) return auth.response;

    const { bikeId } = await context.params;
    const bike = await getOwnedBike(bikeId, auth.user.id);

    if (!bike) {
      return NextResponse.json({ error: "Bike not found." }, { status: 404 });
    }

    // Preserve existing token so the URL stays stable across disable/re-enable cycles.
    const shareToken = bike.shareToken ?? crypto.randomUUID();

    const updated = await prisma.bike.update({
      where: { id: bikeId },
      data: { shareToken, isShared: true },
      select: { shareToken: true, isShared: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to enable bike sharing", error);
    return NextResponse.json({ error: "Could not enable sharing." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) return auth.response;

    const { bikeId } = await context.params;
    const bike = await getOwnedBike(bikeId, auth.user.id);

    if (!bike) {
      return NextResponse.json({ error: "Bike not found." }, { status: 404 });
    }

    // Only toggle isShared — token is preserved so re-enabling restores the same URL.
    await prisma.bike.update({
      where: { id: bikeId },
      data: { isShared: false },
    });

    return NextResponse.json({ isShared: false });
  } catch (error) {
    console.error("Failed to disable bike sharing", error);
    return NextResponse.json({ error: "Could not disable sharing." }, { status: 500 });
  }
}
