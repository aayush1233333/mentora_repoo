/* eslint-disable no-undef */
// Mentora – Firebase Cloud Messaging Service Worker
// Place this file at: frontend/public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// These values are injected at build time via a webpack plugin or
// manually replaced. For CRA, use REACT_APP_ env vars via a custom
// service worker build step.
firebase.initializeApp({
  apiKey:            self.FIREBASE_API_KEY            || "__FIREBASE_API_KEY__",
  authDomain:        self.FIREBASE_AUTH_DOMAIN        || "__FIREBASE_AUTH_DOMAIN__",
  projectId:         self.FIREBASE_PROJECT_ID         || "__FIREBASE_PROJECT_ID__",
  storageBucket:     self.FIREBASE_STORAGE_BUCKET     || "__FIREBASE_STORAGE_BUCKET__",
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID|| "__FIREBASE_MESSAGING_SENDER_ID__",
  appId:             self.FIREBASE_APP_ID             || "__FIREBASE_APP_ID__",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  if (!title) return;

  self.registration.showNotification(title, {
    body,
    icon:  '/logo192.png',
    badge: '/logo192.png',
    data:  payload.data || {},
    actions: [
      { action: 'open',    title: 'Open Mentora' },
      { action: 'dismiss', title: 'Dismiss'      },
    ],
  });
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow('/dashboard');
      })
    );
  }
});
