import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const AVATAR_UPLOAD_DIR = path.join("uploads", "avatars");

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const extensionByMimeType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const formData = await request.formData();
    const avatar = formData.get("avatar");

    if (!(avatar instanceof File)) {
      return NextResponse.json(
        { error: "Select an image file to upload." },
        { status: 400 },
      );
    }

    if (avatar.size <= 0) {
      return NextResponse.json(
        { error: "Uploaded avatar file is empty." },
        { status: 400 },
      );
    }

    if (avatar.size > MAX_AVATAR_BYTES) {
      return NextResponse.json(
        { error: "Avatar must be 5 MB or smaller." },
        { status: 400 },
      );
    }

    if (!allowedMimeTypes.has(avatar.type)) {
      return NextResponse.json(
        { error: "Avatar format must be JPG, PNG, WEBP, or GIF." },
        { status: 400 },
      );
    }

    const extension = extensionByMimeType[avatar.type];
    if (!extension) {
      return NextResponse.json(
        { error: "Could not detect avatar file type." },
        { status: 400 },
      );
    }

    const fileName = `${auth.user.id}-${Date.now()}-${randomUUID()}.${extension}`;
    const publicDir = path.join(process.cwd(), "public");
    const uploadDir = path.join(publicDir, AVATAR_UPLOAD_DIR);
    await mkdir(uploadDir, { recursive: true });

    const arrayBuffer = await avatar.arrayBuffer();
    await writeFile(path.join(uploadDir, fileName), Buffer.from(arrayBuffer));

    const imagePath = `/${AVATAR_UPLOAD_DIR}/${fileName}`.replaceAll("\\", "/");

    await prisma.user.update({
      where: {
        id: auth.user.id,
      },
      data: {
        image: imagePath,
      },
      select: {
        id: true,
      },
    });

    return NextResponse.json({
      image: imagePath,
    });
  } catch (error) {
    console.error("Failed to upload profile avatar", error);
    return NextResponse.json(
      { error: "Could not upload avatar right now." },
      { status: 500 },
    );
  }
}
