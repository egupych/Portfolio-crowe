/**
 * Service Worker for Crowe Uzbekistan Team Portfolio
 * Provides offline caching (PWA) and instant loads.
 */

const CACHE_NAME = 'crowe-portfolio-v6';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/logo.svg',
  '/photos/placeholder.svg',
  '/flags/ru.svg',
  '/flags/uk.svg',
  '/flags/uz.svg',
  '/flags/fr.svg',
  '/flags/it.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ignore cross-origin non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // Navigation requests: Network-first, fallback to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/'))),
    );
    return;
  }

  // Same-origin assets
  if (url.origin === self.location.origin) {
    // Images (photos, certificates, flags): Cache-first with network fallback
    if (
      url.pathname.startsWith('/photos/') ||
      url.pathname.startsWith('/certificates/') ||
      url.pathname.startsWith('/flags/') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.webp') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.ico')
    ) {
      event.respondWith(
        caches.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request)
            .then((response) => {
              if (response.ok) {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
              }
              return response;
            })
            .catch(() => {
              if (url.pathname.startsWith('/photos/')) {
                return caches.match('/photos/placeholder.svg');
              }
            });
        }),
      );
      return;
    }

    // Static code assets (JS, CSS): Network-first with cache fallback
    // Ensures updates are applied immediately when online, while preserving 100% offline support
    if (
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css')
    ) {
      event.respondWith(
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse.ok) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => caches.match(request)),
      );
      return;
    }
  }

  // Third-party CDN assets (Google Fonts): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    }),
  );
});
