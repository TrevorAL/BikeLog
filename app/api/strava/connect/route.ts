import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import {
  STRAVA_OAUTH_COOKIE_MAX_AGE_SECONDS,
  STRAVA_REDIRECT_COOKIE_NAME,
  STRAVA_STATE_COOKIE_NAME,
  sanitizeStravaRedirectPath,
} from "@/lib/strava-oauth";
import { buildStravaAuthorizeUrl } from "@/lib/strava";

const secureCookie = process.env.NODE_ENV === "production";

export async function GET(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const requestUrl = new URL(request.url);
    const redirectTo = sanitizeStravaRedirectPath(requestUrl.searchParams.get("redirectTo"));
    const state = randomUUID();

    const response = NextResponse.redirect(buildStravaAuthorizeUrl(state));

    response.cookies.set({
      name: STRAVA_STATE_COOKIE_NAME,
      value: state,
      maxAge: STRAVA_OAUTH_COOKIE_MAX_AGE_SECONDS,
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookie,
      path: "/",
    });

    response.cookies.set({
      name: STRAVA_REDIRECT_COOKIE_NAME,
      value: redirectTo,
      maxAge: STRAVA_OAUTH_COOKIE_MAX_AGE_SECONDS,
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookie,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Failed to start Strava OAuth flow", error);

    const fallbackUrl = new URL("/rides", request.url);
    fallbackUrl.searchParams.set("strava", "error");
    fallbackUrl.searchParams.set("stravaMessage", "Could not start Strava connection.");

    return NextResponse.redirect(fallbackUrl);
  }
}
