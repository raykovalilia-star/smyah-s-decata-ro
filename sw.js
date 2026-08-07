// Minimal Service Worker — enables PWA install prompt
const CACHE_NAME = 'radem-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

// Network-first: always fetch fresh, fall back to cache only if offline
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache a copy for offline fallback (skip index.html — it has no-cache)
        if (!e.request.url.includes('index.html') && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
