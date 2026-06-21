const CACHE_NAME = "elsepa-pwa-cache-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon.jpg"
];

// Install Event
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event with network-falling-back-to-cache and offline dynamic caching
self.addEventListener("fetch", (e) => {
  // Ignore API requests or dev server websocket connections
  if (e.request.url.includes("/api/") || e.request.url.includes("ws://") || e.request.url.includes("localhost:")) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Cache new successful static assets on the fly
        if (res.status === 200 && e.request.method === "GET") {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, resClone);
          });
        }
        return res;
      })
      .catch(() => {
        return caches.match(e.request).then((cachedRes) => {
          if (cachedRes) return cachedRes;
          // Fallback if index.html is needed
          if (e.request.mode === "navigate") {
            return caches.match("/index.html");
          }
        });
      })
  );
});
