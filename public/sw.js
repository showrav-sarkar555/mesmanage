// Mess Manager — Service Worker
// Caches the app shell for offline use and enables PWA installation

const CACHE_NAME = 'mess-manager-v2';

// Core files to pre-cache (the app shell)
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// ── Install: pre-cache app shell ────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  // Activate immediately without waiting for old tabs to close
  self.skipWaiting();
});

// ── Activate: clean up old caches ───────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

// ── Fetch: network-first with cache fallback ────────────────────────────────
self.addEventListener('fetch', (event) => {
  // Only handle same-origin GET requests, and completely ignore API routes!
  if (
    event.request.method !== 'GET' ||
    !event.request.url.startsWith(self.location.origin) ||
    event.request.url.includes('/api/')
  ) {
    return;
  }

  // For navigation requests (page loads), use network-first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache a fresh copy
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Fallback to cached root when offline
          return caches.match('/') || caches.match(event.request);
        })
    );
    return;
  }

  // For assets, use cache-first with network fallback
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
