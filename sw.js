const CACHE_NAME = 'icse-masterclass-v1.4.1-luxury-refresh';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './ai-tutor.js',
  './dashboard.html',
  './style.css',
  './design-polish.css',
  './luxury-theme.css',
  './script.js',
  './ui-ux.css',
  './ui-ux.js',
  './study-tools.js',
  './student-dashboard.js',
  './syllabus-tracker.js',
  './manifest.json',
  './icseYtLogo.png',
  './luxury-book.svg'
];

// Install Event - Cache Core Static Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching core static assets');
      // One unavailable CDN or optional asset must not prevent the service worker installing.
      return Promise.all(
        ASSETS_TO_CACHE.map(asset =>
          cache.add(asset).catch(error => {
            console.warn('[Service Worker] Could not precache:', asset, error);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean Up Old Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting stale cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fresh HTML and UI styles: network-first prevents stale themes after GitHub Pages releases.
// Offline navigation still falls back to the existing PWA cache.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isAppCode = sameOrigin && /\.(?:html|css|js)$/i.test(url.pathname);
  if (req.mode === 'navigate' || isAppCode) {
    event.respondWith(
      fetch(req).then(response => {
        if (response && response.ok && response.type === 'basic') {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {}));
        }
        return response;
      }).catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === 'navigate') {
          const home = await caches.match('./index.html');
          if (home) return home;
        }
        return Response.error();
      })
    );
    return;
  }
  // External published Google Sheets catalogue: keep existing network-first behaviour.
  if (url.hostname.includes('docs.google.com') || url.hostname.includes('allorigins')) {
    event.respondWith(fetch(req).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {}));
      }
      return response;
    }).catch(() => caches.match(req).then(cached => cached || Response.error())));
    return;
  }
  // Icons and other static assets remain fast/offline via cache-first.
  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(response => {
    if (response && response.ok && response.type === 'basic') {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {}));
    }
    return response;
  })));
});
