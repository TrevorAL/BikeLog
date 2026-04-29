export const STRAVA_STATE_COOKIE_NAME = "bikelog_strava_oauth_state";
export const STRAVA_REDIRECT_COOKIE_NAME = "bikelog_strava_oauth_redirect";
export const STRAVA_OAUTH_COOKIE_MAX_AGE_SECONDS = 60 * 10;

const DEFAULT_REDIRECT_PATH = "/rides";

export function sanitizeStravaRedirectPath(value: string | null | undefined) {
  if (!value) {
    return DEFAULT_REDIRECT_PATH;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return DEFAULT_REDIRECT_PATH;
  }

  return trimmed;
}

export function buildStravaCallbackResultUrl(input: {
  origin: string;
  redirectPath?: string | null;
  status: string;
  message?: string;
}) {
  const redirectPath = sanitizeStravaRedirectPath(input.redirectPath);
  const url = new URL(redirectPath, input.origin);

  url.searchParams.set("strava", input.status);

  if (input.message && input.message.trim().length > 0) {
    url.searchParams.set("stravaMessage", input.message.trim().slice(0, 180));
  }

  return url;
}
