import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { prisma as db } from "@/lib/db";

export const SESSION_COOKIE_NAME = "bikelog_session";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const FALLBACK_DEV_SECRET = "bikelog-dev-secret-change-this";

type SessionPayload = {
  userId: string;
  email: string;
  exp: number;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string | null;
};

function getAuthSecret() {
  const fromEnv = process.env.AUTH_SECRET?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : FALLBACK_DEV_SECRET;
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string) {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
}

function verifySignature(payload: string, signature: string) {
  const expected = signPayload(payload);
  const expectedBytes = Buffer.from(expected, "utf8");
  const signatureBytes = Buffer.from(signature, "utf8");

  if (expectedBytes.length !== signatureBytes.length) {
    return false;
  }

  return timingSafeEqual(expectedBytes, signatureBytes);
}

function parseCookieHeader(rawCookieHeader: string | null, key: string) {
  if (!rawCookieHeader) {
    return undefined;
  }

  const parts = rawCookieHeader.split(";");
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey !== key) {
      continue;
    }

    const rawValue = rest.join("=");

    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return undefined;
}

function parseToken(token: string): SessionPayload | null {
  const [payloadEncoded, signature] = token.split(".");

  if (!payloadEncoded || !signature) {
    return null;
  }

  try {
    const payloadString = decodeBase64Url(payloadEncoded);

    if (!verifySignature(payloadString, signature)) {
      return null;
    }

    const payload = JSON.parse(payloadString) as SessionPayload;

    if (!payload.userId || !payload.email || !payload.exp) {
      return null;
    }

    if (payload.exp <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function createSessionToken(input: { userId: string; email: string }) {
  const payload: SessionPayload = {
    userId: input.userId,
    email: input.email,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };

  const payloadString = JSON.stringify(payload);
  const payloadEncoded = encodeBase64Url(payloadString);
  const signature = signPayload(payloadString);
  return `${payloadEncoded}.${signature}`;
}

export function getSessionFromRequest(request: Request) {
  const token = parseCookieHeader(request.headers.get("cookie"), SESSION_COOKIE_NAME);

  if (!token) {
    return null;
  }

  return parseToken(token);
}

export async function getSessionFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return parseToken(token);
}

async function loadUserFromSession(
  session: SessionPayload | null,
): Promise<AuthenticatedUser | null> {
  if (!session) {
    return null;
  }

  const user = await db.user.findUnique({
    where: {
      id: session.userId,
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  if (!user) {
    return null;
  }

  return user;
}

export async function getCurrentUser() {
  return loadUserFromSession(await getSessionFromCookies());
}

export async function requireServerUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireApiUser(request: Request) {
  const session = getSessionFromRequest(request);
  const user = await loadUserFromSession(session);

  if (!user) {
    return {
      response: NextResponse.json(
        { error: "Unauthorized. Sign in to continue." },
        { status: 401 },
      ),
    } as const;
  }

  return {
    user,
  } as const;
}

export async function setSessionCookie(input: { userId: string; email: string }) {
  const cookieStore = await cookies();
  const token = createSessionToken(input);

  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function upsertUserByEmail(input: { email: string; name?: string }) {
  return db.user.upsert({
    where: {
      email: input.email,
    },
    update: {
      ...(input.name ? { name: input.name } : {}),
    },
    create: {
      email: input.email,
      name: input.name,
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });
}
