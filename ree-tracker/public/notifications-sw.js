// Imported into the generated Workbox service worker via workbox.importScripts
// (see vite.config.js).
//
// push: the daily reminder in a browser (services/webPush.js). The server
// sends through Firebase Cloud Messaging with a notification and
// data.route; this shows it, since nothing else in the worker would.
//
// notificationclick: taps on the reminder and on the in-page Pomodoro
// notification (fired from registration.showNotification): focus an app
// window and take it to the notification's target, or open one there.

self.addEventListener('push', (event) => {
  let payload;
  try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
  const n = payload.notification || {};
  const data = payload.data || {};
  const title = n.title || data.title || 'REE.ai';
  event.waitUntil(self.registration.showNotification(title, {
    body: n.body || data.body || '',
    icon: '/pwa-192x192.png',
    badge: '/badge-96.png',
    // One reminder at a time: a newer one replaces the last.
    tag: 'ree-reminder',
    data: { url: data.route || '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          // A reminder points somewhere (Today, the formula cards): go there.
          if (targetUrl !== '/' && 'navigate' in client) return client.focus().then((c) => (c || client).navigate(targetUrl));
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return undefined;
    })
  );
});
