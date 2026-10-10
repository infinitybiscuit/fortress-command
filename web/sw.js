// Network-first service worker: always fetch fresh when online, fall back to
// the cache so the game still launches from the home screen when offline.
const CACHE = 'fortress-command-v13';
const ASSETS = [
  './', 'index.html', 'style.css', 'manifest.webmanifest',
  'js/main.js', 'js/game.js', 'js/commands.js', 'js/net.js', 'vendor/peerjs-1.5.4.min.js', 'vendor/fonts/press-start-2p-latin-400-normal.woff2', 'js/entities.js', 'js/tilemap.js', 'js/render.js', 'js/config.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Bypass the HTTP cache (GitHub Pages sets max-age=600) so a new deploy is
  // picked up immediately; ETags keep unchanged files cheap.
  const fresh = new URL(e.request.url).origin === location.origin
    ? fetch(e.request.url, { cache: 'no-cache' })
    : fetch(e.request);
  e.respondWith(
    fresh
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request)),
  );
});
