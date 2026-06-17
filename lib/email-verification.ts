import crypto from "node:crypto";

import { prisma } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/email";

const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function generateAndStoreVerificationToken(email: string): Promise<string> {
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + EXPIRY_MS);

  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  await prisma.verificationToken.create({ data: { identifier: email, token, expires } });

  return token;
}

export async function sendVerificationEmail(opts: {
  email: string;
  name?: string | null;
  token: string;
}): Promise<void> {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://bikelog.app").replace(/\/$/, "");
  const verifyUrl = `${appUrl}/api/auth/verify-email?token=${opts.token}&email=${encodeURIComponent(opts.email)}`;

  await sendTransactionalEmail({
    to: opts.email,
    subject: "Verify your BikeLog email address",
    text: [
      `Hi${opts.name ? ` ${opts.name}` : ""},`,
      "",
      "Thanks for signing up for BikeLog! Verify your email address by clicking the link below:",
      "",
      verifyUrl,
      "",
      "This link expires in 24 hours. If you didn't create a BikeLog account you can safely ignore this email.",
      "",
      "— The BikeLog team",
    ].join("\n"),
  });
}

export async function consumeVerificationToken(opts: {
  email: string;
  token: string;
}): Promise<{ ok: true } | { ok: false; reason: "invalid" | "expired" }> {
  const record = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier: opts.email, token: opts.token } },
  });

  if (!record) {
    return { ok: false, reason: "invalid" };
  }

  // Always delete — tokens are single-use regardless of outcome
  await prisma.verificationToken.delete({
    where: { identifier_token: { identifier: opts.email, token: opts.token } },
  });

  if (record.expires < new Date()) {
    return { ok: false, reason: "expired" };
  }

  await prisma.user.update({
    where: { email: opts.email },
    data: { emailVerified: new Date() },
  });

  return { ok: true };
}
