// Assets: serve from cache (works offline at anchor), refresh in the background. Page: network first.
const CACHE = 'workouts-v5';
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
  // The page itself: try the network first so updates show on the next open; fall back to the
  // cached copy when offline or the connection is too slow (3 s).
  if (e.request.mode === 'navigate') {
    e.respondWith(caches.open(CACHE).then(async cache => {
      const net = fetch(e.request, {cache: 'no-cache'}).then(r => { if (r.ok) cache.put('./index.html', r.clone()); return r; });
      const slow = new Promise(res => setTimeout(res, 3000));
      try {
        const r = await Promise.race([net, slow]);
        if (r) return r;
      } catch {}
      return (await cache.match('./index.html')) || net;
    }));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(e.request, {ignoreSearch: true});
    const fresh = fetch(e.request)
      .then(r => { if (r.ok) cache.put(e.request, r.clone()); return r; })
      .catch(() => cached);
    return cached || fresh;
  }));
});
