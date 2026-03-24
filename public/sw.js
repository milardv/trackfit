const CACHE_NAME = "trackfit-shell-v2";
const CACHE_PREFIX = "trackfit-shell-";
const APP_SHELL_PATHS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
];

function getScopedUrl(path) {
  return new URL(path, self.registration.scope).toString();
}

function isCacheableResponse(response) {
  return Boolean(response) && response.ok && response.type === "basic";
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(APP_SHELL_PATHS.map((path) => getScopedUrl(path)))
    ).catch(() => undefined),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map((key) => caches.delete(key)),
    );
    await self.clients.claim();
  })());
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (
      await cache.match(request)
      || await cache.match(getScopedUrl("./"))
      || await cache.match(getScopedUrl("./index.html"))
      || Response.error()
    );
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const networkResponsePromise = fetch(request).then(async (response) => {
    if (isCacheableResponse(response)) {
      await cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  return cached || await networkResponsePromise || Response.error();
}

function shouldUseNetworkFirst(request, url) {
  if (request.mode === "navigate") {
    return true;
  }

  if (
    request.destination === "script"
    || request.destination === "style"
    || request.destination === "manifest"
  ) {
    return true;
  }

  return url.pathname.includes("/assets/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.includes("/__/")) {
    return;
  }

  if (shouldUseNetworkFirst(request, url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
