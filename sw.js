const CACHE_NAME = "chinese-flash-cards-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon-180.png",
  "./icons/icon.svg",
  "./icons/icon-dark.svg",
  "./icons/icon-maskable.svg",
  "./icons/icon-maskable-dark.svg"
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

  // Let cross-origin requests (e.g., pronunciation MP3s) pass through.
  if (url.origin !== self.location.origin) return;

  const isDocument = request.mode === "navigate" || request.destination === "document";

  // Serve manifest with dark-mode colors when user prefers dark (for PWA splash screen)
  if (url.pathname.endsWith("/manifest.webmanifest") || url.pathname.endsWith("manifest.webmanifest")) {
    const cookie = request.headers.get("Cookie") || "";
    const themeMatch = cookie.match(/chinese-flash-cards-theme=(\w+)/);
    const prefersDark = themeMatch ? themeMatch[1] === "dark" : false;
    event.respondWith(
      (caches.match(request).then((hit) => hit || fetch(request))).then((response) => {
        if (!response || !response.ok) return response;
        return response.clone().json().then((manifest) => {
          if (prefersDark) {
            manifest.background_color = "#1a1a1a";
            manifest.theme_color = "#1a1a1a";
          }
          return new Response(JSON.stringify(manifest), {
            headers: { "Content-Type": "application/manifest+json" },
          });
        });
      })
    );
    return;
  }

  if (isDocument) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});
