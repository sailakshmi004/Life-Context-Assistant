/* Awarely service worker: receives web-push messages and opens the app. */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Awarely";
  const options = {
    body: payload.body || "You have a new context alert.",
    icon: "/icon.svg",
    badge: "/icon.svg",
    tag: payload.tag || "awarely-alert",
    renotify: true,
    data: { url: payload.url || "/notifications" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = new URL(
    (event.notification.data && event.notification.data.url) || "/notifications",
    self.location.origin
  ).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin)) {
            try {
              client.navigate(target);
            } catch {
              /* older browsers do not support navigate() */
            }
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      })
  );
});
