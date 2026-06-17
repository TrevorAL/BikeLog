import { type NextRequest, NextResponse } from "next/server";

import { consumeVerificationToken } from "@/lib/email-verification";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const base = new URL(request.url).origin;

  if (!token || !email) {
    return NextResponse.redirect(new URL("/verify-email?error=invalid", base));
  }

  const result = await consumeVerificationToken({ email, token });

  if (!result.ok) {
    return NextResponse.redirect(new URL(`/verify-email?error=${result.reason}`, base));
  }

  return NextResponse.redirect(new URL("/verify-email?success=1", base));
}
