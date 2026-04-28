import { NextResponse } from "next/server";

import { setSessionCookie, upsertUserByEmail } from "@/lib/auth";
import { ensureUserBike } from "@/lib/ownership";

function optionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    const email = optionalString(body.email)?.toLowerCase();
    const name = optionalString(body.name);

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    const user = await upsertUserByEmail({
      email,
      name,
    });

    await ensureUserBike(user.id);
    await setSessionCookie({
      userId: user.id,
      email: user.email,
    });

    return NextResponse.json({
      user,
    });
  } catch (error) {
    console.error("Failed to sign in", error);
    return NextResponse.json({ error: "Could not sign in right now." }, { status: 500 });
  }
}
