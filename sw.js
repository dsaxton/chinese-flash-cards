const CACHE_NAME = "chinese-flash-cards-v2";
const APP_SHELL = [
  "./",
  "./index.html",
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

  // Let cross-origin requests (e.g., pronunciation MP3s) pass through.
  if (url.origin !== self.location.origin) return;

  const isDocument = request.mode === "navigate" || request.destination === "document";

  if (url.pathname.endsWith("manifest.webmanifest")) {
    const cookie = request.headers.get("Cookie") || "";
    const prefersDark = /chinese-flash-cards-theme=dark/.test(cookie);
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request)).then((r) => {
        if (!r?.ok) return r;
        return r.clone().json().then((m) => {
          if (prefersDark) m.background_color = m.theme_color = "#1a1a1a";
          return new Response(JSON.stringify(m), { headers: { "Content-Type": "application/manifest+json" } });
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
