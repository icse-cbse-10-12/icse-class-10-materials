const CACHE_NAME = "icse-masterclass-v1.6.0-academic-library";
const APP_SHELL = [
  "./",
  "./index.html",
  "./login.html",
  "./dashboard.html",
  "./portal.html",
  "./style.css",
  "./style.css?v=study-hub-layout-1",
  "./ui-ux.css",
  "./design-polish.css",
  "./design-polish.css?v=20261026-1",
  "./luxury-theme.css",
  "./luxury-theme.css?v=3",
  "./academic-library.css?v=1",
  "./script.js",
  "./ui-ux.js",
  "./study-tools.js",
  "./student-dashboard.js",
  "./syllabus-tracker.js",
  "./edubot-loader.js?v=1",
  "./manifest.json",
  "./luxury-book.svg",
  "./icseYtLogo.webp",
  "./icseYtFavicon.png",
  "./icseYtPwa-192.png",
  "./icseYtPwa-512.png"
];
const NETWORK_TIMEOUT_MS = 2800;
const CATALOGUE_TIMEOUT_MS = 4500;
const SCRIPT_TIMEOUT_MS = 5500;

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(asset =>
      cache.add(asset).catch(error => {
        console.warn("[Service Worker] Optional shell asset unavailable:", asset, error);
      })
    ));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function fetchWithTimeout(request, timeoutMs) {
  if (typeof AbortController === "undefined") return fetch(request);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function networkFirst(request, timeoutMs, ignoreSearch = false) {
  try {
    const response = await fetchWithTimeout(request, timeoutMs);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(new Request(request.url), response.clone()).catch(() => {});
      return response;
    }
    const cached = await caches.match(request, { ignoreSearch });
    return cached || response;
  } catch (error) {
    const cached = await caches.match(request, { ignoreSearch });
    if (cached) return cached;
    if (request.mode === "navigate") {
      const home = await caches.match("./index.html");
      if (home) return home;
    }
    return Response.error();
  }
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const appCode = sameOrigin && /\.(?:html|css|js)$/i.test(url.pathname);
  const catalogue = url.hostname === "docs.google.com" || url.hostname === "api.allorigins.win";

  if (request.mode === "navigate" || appCode) {
    event.respondWith(networkFirst(request, request.destination === "script" ? SCRIPT_TIMEOUT_MS : NETWORK_TIMEOUT_MS, request.mode === "navigate"));
    return;
  }
  if (catalogue) {
    // Return the last published catalogue immediately on repeat visits, then refresh
    // the cache in the background. First visits still wait for a live response.
    const refresh = fetchWithTimeout(request, CATALOGUE_TIMEOUT_MS).then(async response => {
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(new Request(request.url), response.clone()).catch(() => {});
      }
      return response;
    }).catch(() => null);
    event.waitUntil(refresh.then(() => {}));
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const fresh = await refresh;
      return fresh || Response.error();
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetchWithTimeout(request, NETWORK_TIMEOUT_MS);
      if (response && response.ok && response.type === "basic") {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(new Request(request.url), response.clone()).catch(() => {});
      }
      return response;
    } catch (error) {
      return Response.error();
    }
  })());
});
