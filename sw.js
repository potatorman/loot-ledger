const CACHE_NAME = "loot-ledger-shell-v5";
const SHELL = ["./", "./index.html", "./manifest.json"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("loot-ledger-") && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const isAppAsset = url.origin === self.location.origin;
  const isFirebaseSdk = url.origin === "https://www.gstatic.com" && url.pathname.startsWith("/firebasejs/12.19.0/");
  if (!isAppAsset && !isFirebaseSdk) return;
  if (isAppAsset) {
    // Prefer the network for the app shell, but keep the last working copy for offline reloads.
    event.respondWith(fetch(request).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        const cacheKey = request.mode === "navigate" ? "./index.html" : request;
        caches.open(CACHE_NAME).then(cache => cache.put(cacheKey, copy)).catch(() => {});
      }
      return response;
    }).catch(() => caches.match(request).then(cached => cached || caches.match("./index.html"))));
  } else {
    // Cache versioned Firebase SDK modules after they load once online.
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response && (response.ok || response.type === "opaque")) {
        caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone())).catch(() => {});
      }
      return response;
    })));
  }
});
