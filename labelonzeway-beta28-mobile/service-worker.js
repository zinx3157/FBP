const CACHE = 'labelonzeway-beta28-mobile-v281';
const APP_SHELL = [
  './',
  './index.html',
  './beta2.css',
  './beta2.js',
  './cloud-sync.js',
  './beta24.css',
  './beta24.js',
  './uat-ios.css',
  './uat-ios.js',
  './uat-gate.css',
  './uat-gate.js',
  './beta25-tokens.css',
  './beta25-mobile.css',
  './beta25.js',
  './beta26.css',
  './beta26.js',
  './beta27.css',
  './beta27.js',
  './beta28.css',
  './beta28.js',
  './sync-config.json',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('labelonzeway-beta') && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.includes('/api/')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put('./index.html', copy));
        return response;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(cached => {
        const network = fetch(req).then(response => {
          if (response.ok) caches.open(CACHE).then(cache => cache.put(req, response.clone()));
          return response;
        }).catch(() => cached);
        return cached || network;
      })
    );
  }
});
