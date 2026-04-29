import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  STRAVA_REDIRECT_COOKIE_NAME,
  STRAVA_STATE_COOKIE_NAME,
  buildStravaCallbackResultUrl,
  sanitizeStravaRedirectPath,
} from "@/lib/strava-oauth";
import { exchangeStravaCodeForToken } from "@/lib/strava";

function clearOAuthCookies(response: NextResponse) {
  response.cookies.set({
    name: STRAVA_STATE_COOKIE_NAME,
    value: "",
    maxAge: 0,
    path: "/",
  });
  response.cookies.set({
    name: STRAVA_REDIRECT_COOKIE_NAME,
    value: "",
    maxAge: 0,
    path: "/",
  });
}

function redirectToRidesWithStatus(input: {
  request: Request;
  redirectPath?: string | null;
  status: string;
  message?: string;
}) {
  const requestUrl = new URL(input.request.url);
  const redirectUrl = buildStravaCallbackResultUrl({
    origin: requestUrl.origin,
    redirectPath: input.redirectPath,
    status: input.status,
    message: input.message,
  });

  const response = NextResponse.redirect(redirectUrl);
  clearOAuthCookies(response);
  return response;
}

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const requestUrl = new URL(request.url);
  const state = requestUrl.searchParams.get("state");
  const code = requestUrl.searchParams.get("code");
  const oauthError = requestUrl.searchParams.get("error");
  const cookieStore = await cookies();
  const cookieState = cookieStore.get(STRAVA_STATE_COOKIE_NAME)?.value;
  const cookieRedirect = cookieStore.get(STRAVA_REDIRECT_COOKIE_NAME)?.value;
  const redirectPath = sanitizeStravaRedirectPath(cookieRedirect);

  if (oauthError) {
    return redirectToRidesWithStatus({
      request,
      redirectPath,
      status: "error",
      message: `Strava authorization failed: ${oauthError}`,
    });
  }

  if (!state || !cookieState || state !== cookieState) {
    return redirectToRidesWithStatus({
      request,
      redirectPath,
      status: "error",
      message: "Invalid Strava OAuth state. Please try connecting again.",
    });
  }

  if (!code) {
    return redirectToRidesWithStatus({
      request,
      redirectPath,
      status: "error",
      message: "Missing Strava authorization code.",
    });
  }

  try {
    const token = await exchangeStravaCodeForToken(code);
    const athleteId = token.athlete?.id;

    if (typeof athleteId !== "number" || !Number.isFinite(athleteId)) {
      return redirectToRidesWithStatus({
        request,
        redirectPath,
        status: "error",
        message: "Strava response did not include a valid athlete id.",
      });
    }

    const normalizedAthleteId = BigInt(Math.trunc(athleteId));

    const expiresAt = new Date(token.expires_at * 1000);
    if (Number.isNaN(expiresAt.getTime())) {
      return redirectToRidesWithStatus({
        request,
        redirectPath,
        status: "error",
        message: "Strava token expiration is invalid.",
      });
    }

    const scope = typeof token.scope === "string" && token.scope.trim().length > 0
      ? token.scope.trim()
      : (process.env.STRAVA_SCOPES?.trim() || "read,activity:read");

    await prisma.stravaConnection.upsert({
      where: {
        userId: auth.user.id,
      },
      create: {
        userId: auth.user.id,
        stravaAthleteId: normalizedAthleteId,
        username: token.athlete?.username ?? null,
        firstName: token.athlete?.firstname ?? null,
        lastName: token.athlete?.lastname ?? null,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        tokenType: token.token_type,
        scope,
        expiresAt,
        lastSyncStatus: "CONNECTED",
        lastSyncError: null,
      },
      update: {
        stravaAthleteId: normalizedAthleteId,
        username: token.athlete?.username ?? null,
        firstName: token.athlete?.firstname ?? null,
        lastName: token.athlete?.lastname ?? null,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        tokenType: token.token_type,
        scope,
        expiresAt,
        lastSyncStatus: "CONNECTED",
        lastSyncError: null,
      },
    });

    return redirectToRidesWithStatus({
      request,
      redirectPath,
      status: "connected",
      message: "Strava connected successfully.",
    });
  } catch (error) {
    console.error("Failed to complete Strava OAuth flow", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return redirectToRidesWithStatus({
        request,
        redirectPath,
        status: "error",
        message:
          "That Strava account is already linked to another BikeLog user.",
      });
    }

    const message =
      error instanceof Error
        ? error.message
        : "Could not complete Strava connection right now.";

    return redirectToRidesWithStatus({
      request,
      redirectPath,
      status: "error",
      message,
    });
  }
}
