import { NextResponse } from "next/server";

import { sendTransactionalEmail } from "@/lib/email";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  // Always return 200 so we don't reveal whether the email is registered.
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, passwordHash: true },
  });

  if (user?.passwordHash) {
    const token = crypto.randomUUID();
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpiry: expiry },
    });

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://bike-log.vercel.app").replace(/\/$/, "");
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    await sendTransactionalEmail({
      to: email,
      subject: "Reset your BikeLog password",
      text: [
        `Hi${user.name ? ` ${user.name}` : ""},`,
        "",
        "Someone requested a password reset for your BikeLog account.",
        "Click the link below to set a new password:",
        "",
        resetUrl,
        "",
        "This link expires in 1 hour. If you didn't request this, you can safely ignore this email.",
        "",
        "— The BikeLog team",
      ].join("\n"),
    });
  }

  return NextResponse.json({ ok: true });
}
