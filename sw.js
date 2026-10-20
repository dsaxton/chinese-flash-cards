const CACHE_NAME = "chinese-flash-cards-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./tidbit-match.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon-180.png",
  "./icons/icon.svg",
  "./icons/icon-maskable.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Let cross-origin requests pass through.
  if (url.origin !== self.location.origin) return;

  const isDocument = request.mode === "navigate" || request.destination === "document";

  // Network-first for everything, so index.html, scripts and data stay in sync after a deploy;
  // the cache is only the offline fallback.
  if (isDocument) {
    event.respondWith(
      fetch(request)
        .then((response) => cacheIfComplete("./index.html", response))
        .catch(() => caches.match(request).then((hit) => hit || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => cacheIfComplete(request, response))
      .catch(() => caches.match(request))
  );
});

// Only full 200 responses are cached: error pages must not replace the app shell,
// and partial (206) media responses cannot be stored.
function cacheIfComplete(key, response) {
  if (response.status === 200) {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(key, copy)).catch(() => {});
  }
  return response;
}
