const CACHE = 'labelonzeway-v2.5.3-pwa-20260913';
const APP_SHELL = [
  './',
  './index.html',
  './cloud-sync.js?v=2.0.1-daily',
  './sync-config.json',
  './manifest.webmanifest',
  './tracking/',
  './tracking-dashboard/',
  './icon.svg'
];
const V7_PWA = '/FBP/labelonzeway-v7/?v=release-2.5.3-20260913&pwa=1';

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.includes('/api/')) return;

  if (req.mode === 'navigate') {
    if ((url.pathname === '/FBP/labelonzeway/' || url.pathname === '/FBP/labelonzeway/index.html') && !url.searchParams.has('legacy')) {
      event.respondWith(Promise.resolve(Response.redirect(V7_PWA, 302)));
      return;
    }
    event.respondWith(
      fetch(req).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(req, copy));
        return response;
      }).catch(() => caches.match(req).then(found => found || caches.match('./index.html')))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(response => {
          const copy = response.clone();
          if (response.ok) caches.open(CACHE).then(cache => cache.put(req, copy)).catch(() => {});
          return response;
        });
      })
    );
    return;
  }
  if (/^(cdn\.jsdelivr\.net|unpkg\.com|tessdata\.projectnaptha\.com)$/.test(url.hostname)) {
    event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(req, copy)).catch(() => {});
      return response;
    })));
  }
});
