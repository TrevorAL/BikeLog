import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const BIKE_UPLOAD_DIR = path.join("uploads", "bikes");

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const extensionByMimeType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type RouteContext = {
  params: Promise<{ bikeId: string }>;
};

async function requireOwnedBike(userId: string, bikeId: string) {
  return prisma.bike.findFirst({
    where: { id: bikeId, userId },
    select: { id: true },
  });
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const { bikeId } = await context.params;
    const bike = await requireOwnedBike(auth.user.id, bikeId);
    if (!bike) {
      return NextResponse.json({ error: "Bike not found." }, { status: 404 });
    }

    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File) || image.size <= 0) {
      return NextResponse.json({ error: "Select an image file to upload." }, { status: 400 });
    }

    if (image.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Bike photo must be 8 MB or smaller." }, { status: 400 });
    }

    const extension = extensionByMimeType[image.type];
    if (!allowedMimeTypes.has(image.type) || !extension) {
      return NextResponse.json(
        { error: "Photo format must be JPG, PNG, or WEBP." },
        { status: 400 },
      );
    }

    const fileName = `${bikeId}-${Date.now()}-${randomUUID()}.${extension}`;
    const uploadDir = path.join(process.cwd(), "public", BIKE_UPLOAD_DIR);
    await mkdir(uploadDir, { recursive: true });

    const arrayBuffer = await image.arrayBuffer();
    await writeFile(path.join(uploadDir, fileName), Buffer.from(arrayBuffer));

    const imageUrl = `/${BIKE_UPLOAD_DIR}/${fileName}`.replaceAll("\\", "/");

    await prisma.bike.update({
      where: { id: bikeId },
      data: { imageUrl },
      select: { id: true },
    });

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("Failed to upload bike photo", error);
    return NextResponse.json(
      { error: "Could not upload the photo right now." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const { bikeId } = await context.params;
    const bike = await requireOwnedBike(auth.user.id, bikeId);
    if (!bike) {
      return NextResponse.json({ error: "Bike not found." }, { status: 404 });
    }

    // Clear the reference only; the file itself is cleaned up out of band.
    await prisma.bike.update({
      where: { id: bikeId },
      data: { imageUrl: null },
      select: { id: true },
    });

    return NextResponse.json({ imageUrl: null });
  } catch (error) {
    console.error("Failed to remove bike photo", error);
    return NextResponse.json(
      { error: "Could not remove the photo right now." },
      { status: 500 },
    );
  }
}
