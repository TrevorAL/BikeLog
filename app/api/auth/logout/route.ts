import { NextResponse } from "next/server";

import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  try {
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to sign out", error);
    return NextResponse.json({ error: "Could not sign out right now." }, { status: 500 });
  }
}
