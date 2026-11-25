"use client";

export type PushState = {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
};

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  return registration;
}

export async function getPushState(): Promise<PushState> {
  if (!isPushSupported()) {
    return { supported: false, permission: "unsupported", subscribed: false };
  }
  try {
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    const subscription = await registration?.pushManager.getSubscription();
    return {
      supported: true,
      permission: Notification.permission,
      subscribed: Boolean(subscription),
    };
  } catch {
    return {
      supported: true,
      permission: Notification.permission,
      subscribed: false,
    };
  }
}

export async function subscribeToPush(): Promise<{
  ok: boolean;
  message: string;
}> {
  if (!isPushSupported()) {
    return {
      ok: false,
      message:
        "This browser does not support push notifications. On iPhone, install the site to your Home Screen first.",
    };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return {
      ok: false,
      message: "Notification permission was not granted.",
    };
  }

  const registration = await getRegistration();

  const keyResponse = await fetch("/api/push/public-key");
  const keyJson = await keyResponse.json();
  if (!keyResponse.ok || !keyJson.success) {
    return {
      ok: false,
      message: keyJson.error || "Push is not configured on the server.",
    };
  }

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        keyJson.publicKey
      ) as unknown as BufferSource,
    }));

  const saveResponse = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });
  const saveJson = await saveResponse.json();

  if (!saveResponse.ok || !saveJson.success) {
    return {
      ok: false,
      message: saveJson.error || "Could not save the push subscription.",
    };
  }

  return { ok: true, message: "Browser notifications are now enabled." };
}

export async function unsubscribeFromPush(): Promise<{
  ok: boolean;
  message: string;
}> {
  if (!isPushSupported()) {
    return { ok: false, message: "Push is not supported in this browser." };
  }

  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) {
    return { ok: true, message: "Notifications were already disabled." };
  }

  await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });

  await subscription.unsubscribe();
  return { ok: true, message: "Browser notifications disabled." };
}
