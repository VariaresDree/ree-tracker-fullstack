// Imported into the generated Workbox service worker via workbox.importScripts
// (see vite.config.js). Handles taps on the in-page Pomodoro notification
// (fired from registration.showNotification): focus an existing app window, or
// open one, routing to the notification's target URL when provided.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return undefined;
    })
  );
});
