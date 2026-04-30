import {
  RideType,
  StravaSyncStatus,
  type StravaConnection,
} from "@prisma/client";

import { prisma } from "@/lib/db";

const STRAVA_OAUTH_BASE_URL = "https://www.strava.com/oauth";
const STRAVA_API_BASE_URL = "https://www.strava.com/api/v3";

const DEFAULT_STRAVA_SCOPES = "read,activity:read,profile:read_all";

type StravaAthlete = {
  id: number;
  username?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  bikes?: Array<{
    id?: string | null;
    name?: string | null;
    nickname?: string | null;
    brand_name?: string | null;
    model_name?: string | null;
  }> | null;
};

type StravaTokenResponse = {
  token_type: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope?: string;
  athlete?: StravaAthlete;
  message?: string;
  errors?: Array<{ resource?: string; field?: string; code?: string }>;
};

type StravaActivity = {
  id: number;
  name: string;
  gear_id?: string | null;
  gear?: {
    id?: string | null;
    name?: string | null;
  } | null;
  type?: string | null;
  sport_type?: string | null;
  start_date?: string | null;
  start_date_local?: string | null;
  distance?: number | null;
  moving_time?: number | null;
  elapsed_time?: number | null;
  total_elevation_gain?: number | null;
  elev_high?: number | null;
  elev_low?: number | null;
  average_speed?: number | null;
  max_speed?: number | null;
  average_cadence?: number | null;
  average_watts?: number | null;
  weighted_average_watts?: number | null;
  max_watts?: number | null;
  average_heartrate?: number | null;
  max_heartrate?: number | null;
  calories?: number | null;
  kilojoules?: number | null;
  suffer_score?: number | null;
  kudos_count?: number | null;
  comment_count?: number | null;
  achievement_count?: number | null;
  device_watts?: boolean | null;
  trainer?: boolean | null;
  commute?: boolean | null;
  map?: {
    id?: string | null;
    summary_polyline?: string | null;
    polyline?: string | null;
  } | null;
  description?: string | null;
};

type StravaDetailedGear = {
  id?: string | null;
  name?: string | null;
  brand_name?: string | null;
  model_name?: string | null;
};

type StravaStreamResponseItem = {
  type?: string;
  data?: unknown[];
  series_type?: string;
  original_size?: number;
  resolution?: string;
};

type StravaStreamResponse = Record<string, StravaStreamResponseItem | undefined>;

export type StravaActivityStreams = {
  time: Array<number | null>;
  distance: Array<number | null>;
  altitude: Array<number | null>;
  velocitySmooth: Array<number | null>;
  gradeSmooth: Array<number | null>;
  heartRate: Array<number | null>;
  cadence: Array<number | null>;
  watts: Array<number | null>;
  temperature: Array<number | null>;
  moving: Array<number | null>;
  latLng: Array<{ lat: number; lng: number }>;
};

function toNullableNumberSeries(stream?: StravaStreamResponseItem) {
  if (!stream || !Array.isArray(stream.data)) {
    return [] as Array<number | null>;
  }

  return stream.data.map((value) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "boolean") {
      return value ? 1 : 0;
    }

    return null;
  });
}

function toLatLngSeries(stream?: StravaStreamResponseItem) {
  if (!stream || !Array.isArray(stream.data)) {
    return [] as Array<{ lat: number; lng: number }>;
  }

  const points: Array<{ lat: number; lng: number }> = [];

  for (const value of stream.data) {
    if (!Array.isArray(value) || value.length < 2) {
      continue;
    }

    const lat = value[0];
    const lng = value[1];
    if (
      typeof lat === "number" &&
      Number.isFinite(lat) &&
      typeof lng === "number" &&
      Number.isFinite(lng)
    ) {
      points.push({ lat, lng });
    }
  }

  return points;
}

export type StravaPreviewActivity = {
  stravaActivityId: string;
  name: string;
  type: string;
  gearId: string | null;
  gearName: string | null;
  startedAt: string;
  distanceMiles: number;
  durationMinutes: number | null;
  suggestedRideType: RideType;
};

export type StravaBikeOption = {
  id: string;
  label: string;
};

function formatStravaBikeLabel(input: {
  bikeId: string;
  name?: string | null;
  nickname?: string | null;
  brandName?: string | null;
  modelName?: string | null;
}) {
  const explicitName =
    typeof input.name === "string" && input.name.trim().length > 0
      ? input.name.trim()
      : null;
  const nickname =
    typeof input.nickname === "string" && input.nickname.trim().length > 0
      ? input.nickname.trim()
      : null;
  const brand =
    typeof input.brandName === "string" && input.brandName.trim().length > 0
      ? input.brandName.trim()
      : null;
  const model =
    typeof input.modelName === "string" && input.modelName.trim().length > 0
      ? input.modelName.trim()
      : null;

  const brandAndModel = [brand, model]
    .filter((part): part is string => Boolean(part))
    .join(" ");

  return (
    explicitName ??
    nickname ??
    (brandAndModel.length > 0 ? brandAndModel : `Bike ${input.bikeId}`)
  );
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getStravaScopes() {
  const raw = process.env.STRAVA_SCOPES?.trim() || DEFAULT_STRAVA_SCOPES;
  return raw
    .split(",")
    .map((scope) => scope.trim())
    .filter((scope) => scope.length > 0);
}

export function getStravaConfig() {
  return {
    clientId: getRequiredEnv("STRAVA_CLIENT_ID"),
    clientSecret: getRequiredEnv("STRAVA_CLIENT_SECRET"),
    redirectUri: getRequiredEnv("STRAVA_REDIRECT_URI"),
    scopes: getStravaScopes(),
  };
}

export function buildStravaAuthorizeUrl(state: string) {
  const config = getStravaConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    approval_prompt: "auto",
    scope: config.scopes.join(","),
    state,
  });

  return `${STRAVA_OAUTH_BASE_URL}/authorize?${params.toString()}`;
}

function formatStravaError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const maybeMessage =
    "message" in payload && typeof payload.message === "string"
      ? payload.message
      : undefined;

  return maybeMessage ?? fallback;
}

async function requestStravaToken(
  params: URLSearchParams,
  fallbackError: string,
): Promise<StravaTokenResponse> {
  const response = await fetch(`${STRAVA_OAUTH_BASE_URL}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
    cache: "no-store",
  });

  const payload = (await response.json()) as StravaTokenResponse;
  if (!response.ok) {
    throw new Error(formatStravaError(payload, fallbackError));
  }

  return payload;
}

export async function exchangeStravaCodeForToken(code: string) {
  const config = getStravaConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: "authorization_code",
  });

  return requestStravaToken(params, "Could not exchange Strava authorization code.");
}

async function refreshStravaToken(refreshToken: string) {
  const config = getStravaConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  return requestStravaToken(params, "Could not refresh Strava access token.");
}

async function persistRefreshedToken(connection: StravaConnection) {
  const refreshed = await refreshStravaToken(connection.refreshToken);
  const expiresAt = new Date(refreshed.expires_at * 1000);

  return prisma.stravaConnection.update({
    where: {
      id: connection.id,
    },
    data: {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token,
      tokenType: refreshed.token_type,
      expiresAt,
      ...(typeof refreshed.scope === "string" ? { scope: refreshed.scope } : {}),
    },
  });
}

export async function getFreshStravaConnectionForUser(userId: string) {
  const connection = await prisma.stravaConnection.findUnique({
    where: {
      userId,
    },
  });

  if (!connection) {
    return null;
  }

  const refreshBufferMs = 60 * 1000;
  const isStillValid = connection.expiresAt.getTime() > Date.now() + refreshBufferMs;
  if (isStillValid) {
    return connection;
  }

  return persistRefreshedToken(connection);
}

export async function recordStravaSyncResult(input: {
  userId: string;
  status: StravaSyncStatus;
  importedCount: number;
  error?: string | null;
}) {
  return prisma.stravaConnection.update({
    where: {
      userId: input.userId,
    },
    data: {
      lastSyncAt: new Date(),
      lastSyncStatus: input.status,
      lastSyncImportedCount: Math.max(0, input.importedCount),
      lastSyncError: input.error ? input.error : null,
    },
  });
}

function normalizeStravaActivityType(activity: StravaActivity) {
  return activity.sport_type ?? activity.type ?? "Ride";
}

export function mapStravaActivityToRideType(activity: StravaActivity): RideType {
  const normalizedType = normalizeStravaActivityType(activity);

  if (normalizedType === "Race") {
    return RideType.RACE;
  }

  if (normalizedType === "VirtualRide" || activity.trainer) {
    return RideType.INDOOR;
  }

  if (normalizedType === "Workout") {
    return RideType.TRAINING;
  }

  return RideType.OUTDOOR;
}

function isSupportedStravaRide(activity: StravaActivity) {
  const normalizedType = normalizeStravaActivityType(activity);

  const cyclingTypes = new Set([
    "Ride",
    "VirtualRide",
    "Race",
    "Workout",
    "EBikeRide",
    "EMountainBikeRide",
    "GravelRide",
    "MountainBikeRide",
    "Handcycle",
    "Velomobile",
  ]);

  return cyclingTypes.has(normalizedType);
}

function toPreviewActivity(activity: StravaActivity): StravaPreviewActivity | null {
  if (!isSupportedStravaRide(activity)) {
    return null;
  }

  if (!activity.start_date && !activity.start_date_local) {
    return null;
  }

  const startedAt = new Date(activity.start_date_local ?? activity.start_date ?? "");
  if (Number.isNaN(startedAt.getTime())) {
    return null;
  }

  const distanceMeters = activity.distance ?? 0;
  const distanceMiles = Number((distanceMeters / 1609.344).toFixed(2));
  const durationMinutes =
    typeof activity.moving_time === "number"
      ? Math.max(1, Math.round(activity.moving_time / 60))
      : null;

  return {
    stravaActivityId: String(activity.id),
    name: activity.name || "Strava ride",
    type: normalizeStravaActivityType(activity),
    gearId: activity.gear_id ?? null,
    gearName:
      typeof activity.gear?.name === "string" && activity.gear.name.trim().length > 0
        ? activity.gear.name.trim()
        : null,
    startedAt: startedAt.toISOString(),
    distanceMiles,
    durationMinutes,
    suggestedRideType: mapStravaActivityToRideType(activity),
  };
}

async function fetchStravaApi<T>(input: {
  userId: string;
  path: string;
  query?: Record<string, string>;
}): Promise<T> {
  let connection = await getFreshStravaConnectionForUser(input.userId);
  if (!connection) {
    throw new Error("Strava is not connected.");
  }

  const baseUrl = `${STRAVA_API_BASE_URL}${input.path}`;
  const url = new URL(baseUrl);
  if (input.query) {
    for (const [key, value] of Object.entries(input.query)) {
      url.searchParams.set(key, value);
    }
  }

  async function doRequest(accessToken: string) {
    return fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });
  }

  let response = await doRequest(connection.accessToken);

  if (response.status === 401) {
    connection = await persistRefreshedToken(connection);
    response = await doRequest(connection.accessToken);
  }

  if (!response.ok) {
    let message = "Strava API request failed.";

    try {
      const payload = (await response.json()) as { message?: string };
      if (typeof payload.message === "string" && payload.message.length > 0) {
        message = payload.message;
      }
    } catch {
      // fall through
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function fetchStravaActivityPreview(input: {
  userId: string;
  limit: number;
}) {
  const perPage = Math.max(1, Math.min(input.limit, 100));
  const activities = await fetchStravaApi<StravaActivity[]>({
    userId: input.userId,
    path: "/athlete/activities",
    query: {
      page: "1",
      per_page: String(perPage),
    },
  });

  const previewActivities: StravaPreviewActivity[] = [];
  for (const activity of activities) {
    const preview = toPreviewActivity(activity);
    if (preview) {
      previewActivities.push(preview);
    }
  }

  return previewActivities;
}

export async function fetchStravaBikeOptions(input: { userId: string }) {
  const athlete = await fetchStravaApi<StravaAthlete>({
    userId: input.userId,
    path: "/athlete",
  });

  const bikes = athlete.bikes ?? [];
  const options: StravaBikeOption[] = [];
  const seenBikeIds = new Set<string>();

  for (const bike of bikes) {
    const bikeId = typeof bike.id === "string" ? bike.id.trim() : "";
    if (!bikeId) {
      continue;
    }
    if (seenBikeIds.has(bikeId)) {
      continue;
    }
    seenBikeIds.add(bikeId);

    options.push({
      id: bikeId,
      label: formatStravaBikeLabel({
        bikeId,
        name: bike.name,
        nickname: bike.nickname,
        brandName: bike.brand_name,
        modelName: bike.model_name,
      }),
    });
  }

  return options;
}

export async function fetchStravaGearOptionById(input: {
  userId: string;
  gearId: string;
}) {
  const gear = await fetchStravaApi<StravaDetailedGear>({
    userId: input.userId,
    path: `/gear/${encodeURIComponent(input.gearId)}`,
  });

  const normalizedId =
    typeof gear.id === "string" && gear.id.trim().length > 0
      ? gear.id.trim()
      : input.gearId;

  return {
    id: normalizedId,
    label: formatStravaBikeLabel({
      bikeId: normalizedId,
      name: gear.name,
      brandName: gear.brand_name,
      modelName: gear.model_name,
    }),
  } satisfies StravaBikeOption;
}

export async function resolveStravaBikeOptions(input: {
  userId: string;
  baseOptions: StravaBikeOption[];
  previewActivities: Array<{ gearId: string | null; gearName?: string | null }>;
}) {
  const optionMap = new Map<string, string>();

  for (const option of input.baseOptions) {
    optionMap.set(option.id, option.label);
  }

  const unresolvedGearIds = new Set<string>();
  for (const activity of input.previewActivities) {
    if (!activity.gearId || optionMap.has(activity.gearId)) {
      continue;
    }

    unresolvedGearIds.add(activity.gearId);
  }

  if (unresolvedGearIds.size > 0) {
    const lookedUpOptions = await Promise.all(
      Array.from(unresolvedGearIds).map(async (gearId) => {
        try {
          return await fetchStravaGearOptionById({
            userId: input.userId,
            gearId,
          });
        } catch {
          return null;
        }
      }),
    );

    for (const option of lookedUpOptions) {
      if (!option) {
        continue;
      }

      optionMap.set(option.id, option.label);
    }
  }

  for (const activity of input.previewActivities) {
    if (!activity.gearId || optionMap.has(activity.gearId)) {
      continue;
    }

    const fallbackName =
      typeof activity.gearName === "string" && activity.gearName.trim().length > 0
        ? activity.gearName.trim()
        : `Bike ${activity.gearId}`;

    optionMap.set(activity.gearId, fallbackName);
  }

  return Array.from(optionMap.entries()).map(([id, label]) => ({
    id,
    label,
  }));
}

export async function fetchStravaActivityById(input: {
  userId: string;
  activityId: string;
}) {
  const payload = await fetchStravaApi<StravaActivity>({
    userId: input.userId,
    path: `/activities/${encodeURIComponent(input.activityId)}`,
  });

  return payload;
}

export async function fetchStravaActivityStreamsById(input: {
  userId: string;
  activityId: string;
}) {
  const payload = await fetchStravaApi<StravaStreamResponse>({
    userId: input.userId,
    path: `/activities/${encodeURIComponent(input.activityId)}/streams`,
    query: {
      keys: "time,distance,altitude,velocity_smooth,grade_smooth,heartrate,cadence,watts,temp,moving,latlng",
      key_by_type: "true",
      resolution: "high",
      series_type: "time",
    },
  });

  return {
    time: toNullableNumberSeries(payload.time),
    distance: toNullableNumberSeries(payload.distance),
    altitude: toNullableNumberSeries(payload.altitude),
    velocitySmooth: toNullableNumberSeries(payload.velocity_smooth),
    gradeSmooth: toNullableNumberSeries(payload.grade_smooth),
    heartRate: toNullableNumberSeries(payload.heartrate),
    cadence: toNullableNumberSeries(payload.cadence),
    watts: toNullableNumberSeries(payload.watts),
    temperature: toNullableNumberSeries(payload.temp),
    moving: toNullableNumberSeries(payload.moving),
    latLng: toLatLngSeries(payload.latlng),
  } satisfies StravaActivityStreams;
}

export function toRideCreationPayload(activity: StravaActivity) {
  if (!isSupportedStravaRide(activity)) {
    return null;
  }

  const startedAt = new Date(activity.start_date_local ?? activity.start_date ?? "");
  if (Number.isNaN(startedAt.getTime())) {
    return null;
  }

  const distanceMeters = activity.distance ?? 0;
  const distanceMiles = distanceMeters / 1609.344;
  if (!Number.isFinite(distanceMiles) || distanceMiles <= 0) {
    return null;
  }

  const durationMinutes =
    typeof activity.moving_time === "number"
      ? Math.max(1, Math.round(activity.moving_time / 60))
      : undefined;

  const description = activity.description?.trim();
  const notes = [
    `Imported from Strava activity #${activity.id}.`,
    description ? `Strava notes: ${description}` : undefined,
  ]
    .filter((line): line is string => Boolean(line))
    .join(" ");

  return {
    date: startedAt,
    distanceMiles: Number(distanceMiles.toFixed(2)),
    durationMinutes,
    rideType: mapStravaActivityToRideType(activity),
    notes,
  };
}
