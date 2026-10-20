const CACHE_NAME = "published-story-reader-v1";
const SHELL = ["./", "./index.html", "./styles.css", "./reader.js", "./story.json", "./manifest.json", "./images/icon-192.png", "./images/icon-512.png"];
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(SHELL);
    try {
      const response = await fetch("./story.json");
      const story = await response.json();
      const paths = [story.cover, ...(story.pages || []).map(page => page.image)]
        .filter(path => typeof path === "string" && !path.startsWith("data:") && !/^https?:/i.test(path))
        .map(path => path.startsWith("./") ? path : `./${path.replace(/^\/+/, "")}`);
      await cache.addAll([...new Set(paths)]);
    } catch (_) { /* shell remains available even if optional art caching fails */ }
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response && response.ok) caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
    return response;
  }).catch(() => caches.match("./index.html"))));
});
