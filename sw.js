// Serve from cache first (works offline at anchor), refresh the cache in the background.
const CACHE = 'workouts-v4';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './apple-touch-icon.png', './icon-512.png',
  './fonts/barlow-condensed-400.woff2', './fonts/barlow-condensed-500.woff2', './fonts/space-grotesk.woff2',
  './fonts/ibm-plex-mono-400.woff2', './fonts/ibm-plex-mono-500.woff2', './fonts/plus-jakarta-sans.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(e.request, {ignoreSearch: true});
    const fresh = fetch(e.request)
      .then(r => { if (r.ok) cache.put(e.request, r.clone()); return r; })
      .catch(() => cached);
    return cached || fresh;
  }));
});
