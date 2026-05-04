import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationSendPolicy,
  type BikeNotificationPreference,
} from "@prisma/client";

import { computeBikeMaintenance } from "@/lib/bike-maintenance";
import { prisma } from "@/lib/db";

const DIGEST_DUE_KEY = "maintenance-digest";
const INSTANT_DUE_KEY_PREFIX = "maintenance-instant";
const DEFAULT_TIMEZONE = "UTC";

type BikeSummary = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  year: number | null;
};

type DueAlertItem = {
  key: string;
  label: string;
  status: "DUE_NOW" | "OVERDUE";
  detail: string;
};

type BikeDueAlert = {
  bikeId: string;
  bikeLabel: string;
  items: DueAlertItem[];
};

export type NotificationBellState = {
  notificationsEnabled: boolean;
  pendingCount: number;
};

export type ProfileNotificationSettings = {
  notificationsEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  phoneNumber: string | null;
  sendPolicy: NotificationSendPolicy;
  digestHourLocal: number;
  quietHoursEnabled: boolean;
  quietHoursStartHour: number;
  quietHoursEndHour: number;
  sendWindowEnabled: boolean;
  sendWindowStartHour: number;
  sendWindowEndHour: number;
  bikes: Array<{
    bikeId: string;
    bikeLabel: string;
    enabled: boolean;
    emailEnabled: boolean;
    smsEnabled: boolean;
  }>;
};

type NotificationPreferencesUpdateInput = {
  notificationsEnabled?: boolean;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  phoneNumber?: string | null;
  sendPolicy?: NotificationSendPolicy;
  digestHourLocal?: number;
  quietHoursEnabled?: boolean;
  quietHoursStartHour?: number;
  quietHoursEndHour?: number;
  sendWindowEnabled?: boolean;
  sendWindowStartHour?: number;
  sendWindowEndHour?: number;
  bikePreferences?: Array<{
    bikeId: string;
    enabled?: boolean;
    emailEnabled?: boolean;
    smsEnabled?: boolean;
  }>;
};

export type NotificationDispatchSummary = {
  attempted: number;
  delivered: number;
  skipped: number;
  errors: number;
};

export type NotificationGlobalDispatchSummary = NotificationDispatchSummary & {
  usersEvaluated: number;
  usersDispatched: number;
};

function buildBikeLabel(input: BikeSummary) {
  const detailed = [input.year, input.brand, input.model].filter(Boolean).join(" ").trim();
  return detailed.length > 0 ? detailed : input.name;
}

function formatStatusLabel(status: "DUE_NOW" | "OVERDUE") {
  return status === "OVERDUE" ? "Overdue" : "Due now";
}

function normalizePhoneNumber(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

type LocalClock = {
  dayKey: string;
  hour: number;
  minute: number;
};

function normalizeHour(value: number, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  const normalized = Math.trunc(value);
  if (normalized < 0 || normalized > 23) {
    return fallback;
  }

  return normalized;
}

function resolveTimezone(timezone: string | null | undefined) {
  const trimmed = timezone?.trim();
  if (!trimmed) {
    return DEFAULT_TIMEZONE;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: trimmed }).format();
    return trimmed;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export function getLocalClock(
  timezone: string | null | undefined,
  referenceTime: Date = new Date(),
): LocalClock {
  const safeTimezone = resolveTimezone(timezone);

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: safeTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      hourCycle: "h23",
    });

    const parts = formatter.formatToParts(referenceTime);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
    const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");

    if (year && month && day) {
      return {
        dayKey: `${year}-${month}-${day}`,
        hour: normalizeHour(hour, referenceTime.getUTCHours()),
        minute: Number.isFinite(minute) ? Math.max(0, Math.min(59, Math.trunc(minute))) : 0,
      };
    }
  } catch {
    // Fall through to UTC fallback below.
  }

  return {
    dayKey: referenceTime.toISOString().slice(0, 10),
    hour: referenceTime.getUTCHours(),
    minute: referenceTime.getUTCMinutes(),
  };
}

function isHourInsideWindow(hour: number, startHour: number, endHour: number) {
  const currentHour = normalizeHour(hour, 0);
  const start = normalizeHour(startHour, 0);
  const end = normalizeHour(endHour, 23);

  if (start === end) {
    return true;
  }

  if (start < end) {
    return currentHour >= start && currentHour < end;
  }

  return currentHour >= start || currentHour < end;
}

export function shouldSendNotificationNow(input: {
  sendPolicy: NotificationSendPolicy;
  digestHourLocal: number;
  quietHoursEnabled: boolean;
  quietHoursStartHour: number;
  quietHoursEndHour: number;
  sendWindowEnabled: boolean;
  sendWindowStartHour: number;
  sendWindowEndHour: number;
  localHour: number;
}) {
  const localHour = normalizeHour(input.localHour, 0);

  if (
    input.sendPolicy === NotificationSendPolicy.DIGEST_DAILY &&
    localHour !== normalizeHour(input.digestHourLocal, 9)
  ) {
    return false;
  }

  if (
    input.quietHoursEnabled
  ) {
    const quietStart = normalizeHour(input.quietHoursStartHour, 22);
    const quietEnd = normalizeHour(input.quietHoursEndHour, 7);
    if (quietStart !== quietEnd && isHourInsideWindow(localHour, quietStart, quietEnd)) {
      return false;
    }
  }

  if (
    input.sendWindowEnabled &&
    !isHourInsideWindow(localHour, input.sendWindowStartHour, input.sendWindowEndHour)
  ) {
    return false;
  }

  return true;
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

function buildInstantDueKey(items: DueAlertItem[]) {
  const signature = items
    .map((item) => `${item.key}:${item.status}`)
    .sort()
    .join("|");
  return `${INSTANT_DUE_KEY_PREFIX}:${hashString(signature)}`;
}

async function ensureNotificationPreference(userId: string) {
  let preference = await prisma.userNotificationPreference.findUnique({
    where: {
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!preference) {
    preference = await prisma.userNotificationPreference.create({
      data: {
        userId,
      },
      select: {
        id: true,
      },
    });
  }

  const bikes = await prisma.bike.findMany({
    where: {
      userId,
      isArchived: false,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
    },
  });

  const bikeIds = bikes.map((bike) => bike.id);

  if (bikeIds.length === 0) {
    await prisma.bikeNotificationPreference.deleteMany({
      where: {
        userId,
      },
    });
  } else {
    const existingBikePreferences = await prisma.bikeNotificationPreference.findMany({
      where: {
        userId,
      },
      select: {
        bikeId: true,
      },
    });

    const existingBikeIdSet = new Set(existingBikePreferences.map((entry) => entry.bikeId));
    const missingBikeIds = bikeIds.filter((bikeId) => !existingBikeIdSet.has(bikeId));

    if (missingBikeIds.length > 0) {
      await prisma.bikeNotificationPreference.createMany({
        data: missingBikeIds.map((bikeId) => ({
          userNotificationPreferenceId: preference.id,
          userId,
          bikeId,
          enabled: true,
          emailEnabled: true,
          smsEnabled: false,
        })),
        skipDuplicates: true,
      });
    }

    await prisma.bikeNotificationPreference.deleteMany({
      where: {
        userId,
        bikeId: {
          notIn: bikeIds,
        },
      },
    });
  }
}

async function loadPreferenceWithBikes(userId: string) {
  await ensureNotificationPreference(userId);

  const preference = await prisma.userNotificationPreference.findUnique({
    where: {
      userId,
    },
    include: {
      bikePreferences: {
        include: {
          bike: {
            select: {
              id: true,
              name: true,
              brand: true,
              model: true,
              year: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (!preference) {
    throw new Error("Notification preference not found.");
  }

  const sortedBikePreferences = [...preference.bikePreferences].sort(
    (a, b) => a.bike.createdAt.getTime() - b.bike.createdAt.getTime(),
  );

  return {
    ...preference,
    bikePreferences: sortedBikePreferences,
  };
}

async function getMaintenanceDueAlerts(userId: string): Promise<BikeDueAlert[]> {
  const bikes = await prisma.bike.findMany({
    where: {
      userId,
      isArchived: false,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      name: true,
      brand: true,
      model: true,
      year: true,
      components: {
        where: {
          isActive: true,
        },
        select: {
          name: true,
          type: true,
          currentMileage: true,
        },
      },
      rides: {
        select: {
          distanceMiles: true,
          durationMinutes: true,
          date: true,
          wasWet: true,
          roadCondition: true,
        },
        orderBy: {
          date: "desc",
        },
      },
      maintenanceEvents: {
        select: {
          type: true,
          date: true,
          mileageAtService: true,
          notes: true,
        },
        orderBy: {
          date: "desc",
        },
      },
    },
  });

  return bikes
    .map((bike) => {
      const maintenance = computeBikeMaintenance({
        rides: bike.rides,
        components: bike.components,
        maintenanceEvents: bike.maintenanceEvents,
      });

      const dueItems = maintenance.maintenanceSummary.dueItems
        .filter(
          (item): item is DueAlertItem =>
            item.status === "DUE_NOW" || item.status === "OVERDUE",
        )
        .map((item) => ({
          key: item.key,
          label: item.label,
          status: item.status,
          detail: item.detail,
        }));

      return {
        bikeId: bike.id,
        bikeLabel: buildBikeLabel(bike),
        items: dueItems,
      };
    })
    .filter((entry) => entry.items.length > 0);
}

type DeliveryResult = {
  status: NotificationDeliveryStatus;
  errorMessage?: string;
};

async function sendMaintenanceEmailDigest(input: {
  to: string;
  bikeLabel: string;
  dueItems: DueAlertItem[];
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromAddress = process.env.NOTIFICATIONS_FROM_EMAIL?.trim();

  if (!apiKey || !fromAddress) {
    return {
      status: NotificationDeliveryStatus.SKIPPED,
      errorMessage: "Email delivery provider is not configured.",
    } satisfies DeliveryResult;
  }

  const subject = `BikeLog maintenance due: ${input.bikeLabel}`;
  const bulletLines = input.dueItems.map(
    (item) => `- ${item.label}: ${item.detail} (${formatStatusLabel(item.status)})`,
  );
  const textBody = [
    `Maintenance items are due for ${input.bikeLabel}:`,
    ...bulletLines,
    "",
    "Open BikeLog maintenance to review and log service.",
  ].join("\n");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [input.to],
        subject,
        text: textBody,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        status: NotificationDeliveryStatus.ERROR,
        errorMessage: `Email provider error: ${errorBody.slice(0, 400)}`,
      } satisfies DeliveryResult;
    }

    return {
      status: NotificationDeliveryStatus.DELIVERED,
    } satisfies DeliveryResult;
  } catch (error) {
    return {
      status: NotificationDeliveryStatus.ERROR,
      errorMessage:
        error instanceof Error ? error.message : "Unknown email delivery error.",
    } satisfies DeliveryResult;
  }
}

async function sendMaintenanceSmsDigest(input: {
  to: string;
  bikeLabel: string;
  dueItems: DueAlertItem[];
}) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromPhone = process.env.TWILIO_FROM_PHONE?.trim();

  if (!accountSid || !authToken || !fromPhone) {
    return {
      status: NotificationDeliveryStatus.SKIPPED,
      errorMessage: "SMS delivery provider is not configured.",
    } satisfies DeliveryResult;
  }

  const condensedItems = input.dueItems
    .slice(0, 3)
    .map((item) => `${item.label} (${formatStatusLabel(item.status).toLowerCase()})`)
    .join(", ");
  const extraCount = Math.max(0, input.dueItems.length - 3);
  const extraSuffix = extraCount > 0 ? ` +${extraCount} more.` : ".";
  const body = `BikeLog: ${input.bikeLabel} maintenance due - ${condensedItems}${extraSuffix}`;

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: input.to,
          From: fromPhone,
          Body: body,
        }).toString(),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        status: NotificationDeliveryStatus.ERROR,
        errorMessage: `SMS provider error: ${errorBody.slice(0, 400)}`,
      } satisfies DeliveryResult;
    }

    return {
      status: NotificationDeliveryStatus.DELIVERED,
    } satisfies DeliveryResult;
  } catch (error) {
    return {
      status: NotificationDeliveryStatus.ERROR,
      errorMessage:
        error instanceof Error ? error.message : "Unknown SMS delivery error.",
    } satisfies DeliveryResult;
  }
}

function resolveBikePreference(
  bikePreferences: BikeNotificationPreference[],
  bikeId: string,
) {
  return bikePreferences.find((entry) => entry.bikeId === bikeId);
}

export async function getNotificationPreferencesForUser(
  userId: string,
): Promise<ProfileNotificationSettings> {
  const preference = await loadPreferenceWithBikes(userId);

  return {
    notificationsEnabled: preference.notificationsEnabled,
    emailEnabled: preference.emailEnabled,
    smsEnabled: preference.smsEnabled,
    phoneNumber: preference.phoneNumber,
    sendPolicy: preference.sendPolicy,
    digestHourLocal: preference.digestHourLocal,
    quietHoursEnabled: preference.quietHoursEnabled,
    quietHoursStartHour: preference.quietHoursStartHour,
    quietHoursEndHour: preference.quietHoursEndHour,
    sendWindowEnabled: preference.sendWindowEnabled,
    sendWindowStartHour: preference.sendWindowStartHour,
    sendWindowEndHour: preference.sendWindowEndHour,
    bikes: preference.bikePreferences.map((entry) => ({
      bikeId: entry.bikeId,
      bikeLabel: buildBikeLabel(entry.bike),
      enabled: entry.enabled,
      emailEnabled: entry.emailEnabled,
      smsEnabled: entry.smsEnabled,
    })),
  };
}

export async function updateNotificationPreferencesForUser(
  userId: string,
  input: NotificationPreferencesUpdateInput,
) {
  const preference = await loadPreferenceWithBikes(userId);

  await prisma.userNotificationPreference.update({
    where: {
      userId,
    },
    data: {
      ...(typeof input.notificationsEnabled === "boolean"
        ? { notificationsEnabled: input.notificationsEnabled }
        : {}),
      ...(typeof input.emailEnabled === "boolean"
        ? { emailEnabled: input.emailEnabled }
        : {}),
      ...(typeof input.smsEnabled === "boolean" ? { smsEnabled: input.smsEnabled } : {}),
      ...(input.phoneNumber !== undefined
        ? { phoneNumber: normalizePhoneNumber(input.phoneNumber) }
        : {}),
      ...(input.sendPolicy ? { sendPolicy: input.sendPolicy } : {}),
      ...(typeof input.digestHourLocal === "number"
        ? { digestHourLocal: normalizeHour(input.digestHourLocal, 9) }
        : {}),
      ...(typeof input.quietHoursEnabled === "boolean"
        ? { quietHoursEnabled: input.quietHoursEnabled }
        : {}),
      ...(typeof input.quietHoursStartHour === "number"
        ? { quietHoursStartHour: normalizeHour(input.quietHoursStartHour, 22) }
        : {}),
      ...(typeof input.quietHoursEndHour === "number"
        ? { quietHoursEndHour: normalizeHour(input.quietHoursEndHour, 7) }
        : {}),
      ...(typeof input.sendWindowEnabled === "boolean"
        ? { sendWindowEnabled: input.sendWindowEnabled }
        : {}),
      ...(typeof input.sendWindowStartHour === "number"
        ? { sendWindowStartHour: normalizeHour(input.sendWindowStartHour, 8) }
        : {}),
      ...(typeof input.sendWindowEndHour === "number"
        ? { sendWindowEndHour: normalizeHour(input.sendWindowEndHour, 21) }
        : {}),
    },
  });

  if (input.bikePreferences?.length) {
    for (const bikePreferenceUpdate of input.bikePreferences) {
      const existingPreference = resolveBikePreference(
        preference.bikePreferences,
        bikePreferenceUpdate.bikeId,
      );

      if (!existingPreference) {
        continue;
      }

      await prisma.bikeNotificationPreference.update({
        where: {
          userId_bikeId: {
            userId,
            bikeId: bikePreferenceUpdate.bikeId,
          },
        },
        data: {
          ...(typeof bikePreferenceUpdate.enabled === "boolean"
            ? { enabled: bikePreferenceUpdate.enabled }
            : {}),
          ...(typeof bikePreferenceUpdate.emailEnabled === "boolean"
            ? { emailEnabled: bikePreferenceUpdate.emailEnabled }
            : {}),
          ...(typeof bikePreferenceUpdate.smsEnabled === "boolean"
            ? { smsEnabled: bikePreferenceUpdate.smsEnabled }
            : {}),
        },
      });
    }
  }

  return getNotificationPreferencesForUser(userId);
}

export async function getNotificationBellStateForUser(
  userId: string,
): Promise<NotificationBellState> {
  const [preferences, alerts] = await Promise.all([
    getNotificationPreferencesForUser(userId),
    getMaintenanceDueAlerts(userId),
  ]);

  const bikePreferenceByBikeId = new Map(
    preferences.bikes.map((entry) => [entry.bikeId, entry] as const),
  );

  const pendingCount = alerts.reduce((sum, alert) => {
    const bikePreference = bikePreferenceByBikeId.get(alert.bikeId);
    if (!bikePreference?.enabled) {
      return sum;
    }

    return sum + alert.items.length;
  }, 0);

  return {
    notificationsEnabled: preferences.notificationsEnabled,
    pendingCount,
  };
}

export async function dispatchMaintenanceNotificationsForUser(
  userId: string,
): Promise<NotificationDispatchSummary> {
  const [preferences, alerts, user] = await Promise.all([
    loadPreferenceWithBikes(userId),
    getMaintenanceDueAlerts(userId),
    prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        email: true,
        timezone: true,
      },
    }),
  ]);

  const summary: NotificationDispatchSummary = {
    attempted: 0,
    delivered: 0,
    skipped: 0,
    errors: 0,
  };

  if (!preferences.notificationsEnabled) {
    return summary;
  }

  const localClock = getLocalClock(user?.timezone);
  const canSendNow = shouldSendNotificationNow({
    sendPolicy: preferences.sendPolicy,
    digestHourLocal: preferences.digestHourLocal,
    quietHoursEnabled: preferences.quietHoursEnabled,
    quietHoursStartHour: preferences.quietHoursStartHour,
    quietHoursEndHour: preferences.quietHoursEndHour,
    sendWindowEnabled: preferences.sendWindowEnabled,
    sendWindowStartHour: preferences.sendWindowStartHour,
    sendWindowEndHour: preferences.sendWindowEndHour,
    localHour: localClock.hour,
  });

  if (!canSendNow) {
    return summary;
  }

  const dayKey = localClock.dayKey;
  const smsRecipient = normalizePhoneNumber(preferences.phoneNumber);
  const bikePreferenceByBikeId = new Map(
    preferences.bikePreferences.map((entry) => [entry.bikeId, entry] as const),
  );

  for (const bikeAlert of alerts) {
    const bikePreference = bikePreferenceByBikeId.get(bikeAlert.bikeId);
    if (!bikePreference?.enabled) {
      continue;
    }

    const channels: NotificationChannel[] = [];
    if (preferences.emailEnabled && bikePreference.emailEnabled && user?.email) {
      channels.push(NotificationChannel.EMAIL);
    }

    if (preferences.smsEnabled && bikePreference.smsEnabled && smsRecipient) {
      channels.push(NotificationChannel.SMS);
    }

    if (channels.length === 0) {
      continue;
    }

    const dueKey =
      preferences.sendPolicy === NotificationSendPolicy.DIGEST_DAILY
        ? DIGEST_DUE_KEY
        : buildInstantDueKey(bikeAlert.items);

    for (const channel of channels) {
      const existingDelivery = await prisma.maintenanceNotificationLog.findUnique({
        where: {
          userId_bikeId_dueKey_channel_dayKey: {
            userId,
            bikeId: bikeAlert.bikeId,
            dueKey,
            channel,
            dayKey,
          },
        },
        select: {
          id: true,
        },
      });

      if (existingDelivery) {
        summary.skipped += 1;
        continue;
      }

      summary.attempted += 1;

      const createdLog = await prisma.maintenanceNotificationLog.create({
        data: {
          userNotificationPreferenceId: preferences.id,
          userId,
          bikeId: bikeAlert.bikeId,
          dueKey,
          dueStatus: bikeAlert.items.some((item) => item.status === "OVERDUE")
            ? "OVERDUE"
            : "DUE_NOW",
          channel,
          dayKey,
          deliveryStatus: NotificationDeliveryStatus.PENDING,
        },
      });

      const deliveryResult =
        channel === NotificationChannel.EMAIL && user?.email
          ? await sendMaintenanceEmailDigest({
              to: user.email,
              bikeLabel: bikeAlert.bikeLabel,
              dueItems: bikeAlert.items,
            })
          : channel === NotificationChannel.SMS && smsRecipient
            ? await sendMaintenanceSmsDigest({
                to: smsRecipient,
                bikeLabel: bikeAlert.bikeLabel,
                dueItems: bikeAlert.items,
              })
            : {
                status: NotificationDeliveryStatus.SKIPPED,
                errorMessage: "No valid recipient configured.",
              };

      if (deliveryResult.status === NotificationDeliveryStatus.DELIVERED) {
        summary.delivered += 1;
      } else if (deliveryResult.status === NotificationDeliveryStatus.ERROR) {
        summary.errors += 1;
      } else {
        summary.skipped += 1;
      }

      await prisma.maintenanceNotificationLog.update({
        where: {
          id: createdLog.id,
        },
        data: {
          deliveryStatus: deliveryResult.status,
          deliveredAt:
            deliveryResult.status === NotificationDeliveryStatus.DELIVERED
              ? new Date()
              : null,
          errorMessage: deliveryResult.errorMessage,
        },
      });
    }
  }

  return summary;
}

export async function dispatchMaintenanceNotificationsForAllUsers(): Promise<NotificationGlobalDispatchSummary> {
  const bikeOwners = await prisma.bike.findMany({
    where: {
      userId: {
        not: null,
      },
      isArchived: false,
    },
    distinct: ["userId"],
    select: {
      userId: true,
    },
  });

  const userIds = bikeOwners
    .map((entry) => entry.userId)
    .filter((userId): userId is string => typeof userId === "string" && userId.length > 0);

  const summary: NotificationGlobalDispatchSummary = {
    usersEvaluated: userIds.length,
    usersDispatched: 0,
    attempted: 0,
    delivered: 0,
    skipped: 0,
    errors: 0,
  };

  for (const userId of userIds) {
    try {
      const userSummary = await dispatchMaintenanceNotificationsForUser(userId);
      summary.attempted += userSummary.attempted;
      summary.delivered += userSummary.delivered;
      summary.skipped += userSummary.skipped;
      summary.errors += userSummary.errors;

      if (
        userSummary.attempted > 0 ||
        userSummary.delivered > 0 ||
        userSummary.skipped > 0 ||
        userSummary.errors > 0
      ) {
        summary.usersDispatched += 1;
      }
    } catch (error) {
      summary.errors += 1;
      console.error("Failed to dispatch maintenance notifications for user", {
        userId,
        error,
      });
    }
  }

  return summary;
}
