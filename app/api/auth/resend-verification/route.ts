import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  generateAndStoreVerificationToken,
  sendVerificationEmail,
} from "@/lib/email-verification";

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) return auth.response;

  const dbUser = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { email: true, name: true, emailVerified: true, passwordHash: true },
  });

  if (!dbUser?.email) {
    return NextResponse.json({ error: "No email address on this account." }, { status: 400 });
  }

  if (!dbUser.passwordHash) {
    return NextResponse.json(
      { error: "Google accounts are verified automatically." },
      { status: 400 },
    );
  }

  if (dbUser.emailVerified) {
    return NextResponse.json({ error: "Email address is already verified." }, { status: 400 });
  }

  try {
    const token = await generateAndStoreVerificationToken(dbUser.email);
    await sendVerificationEmail({ email: dbUser.email, name: dbUser.name, token });
  } catch {
    return NextResponse.json(
      { error: "Could not send verification email. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
