const CACHE_NAME = 'harshil-goyal-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass through fetch for dynamic API and tracking routes
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
