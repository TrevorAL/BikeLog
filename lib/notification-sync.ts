export const NOTIFICATIONS_ENABLED_EVENT = "bikelog:notifications-enabled-change";
export const NOTIFICATIONS_ENABLED_STORAGE_KEY = "bikelog:notifications-enabled";

type NotificationsEnabledDetail = {
  enabled: boolean;
};

function isBrowser() {
  return typeof window !== "undefined";
}

export function readNotificationsEnabledValue() {
  if (!isBrowser()) {
    return undefined;
  }

  const raw = window.localStorage.getItem(NOTIFICATIONS_ENABLED_STORAGE_KEY);
  if (raw === "1") {
    return true;
  }

  if (raw === "0") {
    return false;
  }

  return undefined;
}

export function publishNotificationsEnabledValue(enabled: boolean) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(NOTIFICATIONS_ENABLED_STORAGE_KEY, enabled ? "1" : "0");
  window.dispatchEvent(
    new CustomEvent<NotificationsEnabledDetail>(NOTIFICATIONS_ENABLED_EVENT, {
      detail: {
        enabled,
      },
    }),
  );
}

export function subscribeToNotificationsEnabledChange(
  onChange: (enabled: boolean) => void,
) {
  if (!isBrowser()) {
    return () => undefined;
  }

  function handleCustomEvent(event: Event) {
    const customEvent = event as CustomEvent<NotificationsEnabledDetail>;
    if (typeof customEvent.detail?.enabled === "boolean") {
      onChange(customEvent.detail.enabled);
    }
  }

  function handleStorageEvent(event: StorageEvent) {
    if (event.key !== NOTIFICATIONS_ENABLED_STORAGE_KEY) {
      return;
    }

    if (event.newValue === "1") {
      onChange(true);
    } else if (event.newValue === "0") {
      onChange(false);
    }
  }

  window.addEventListener(NOTIFICATIONS_ENABLED_EVENT, handleCustomEvent);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(NOTIFICATIONS_ENABLED_EVENT, handleCustomEvent);
    window.removeEventListener("storage", handleStorageEvent);
  };
}
