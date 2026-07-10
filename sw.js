// Woods of Parkview — service worker.
// Network-first so updates always show when online; cache fallback offline.
// Bump the cache name when shipping big changes.
var CACHE = "wopha-v1";

var CORE = [
  "./",
  "index.html",
  "membership.html",
  "pool.html",
  "tennis.html",
  "swim-team.html",
  "community.html",
  "board.html",
  "suggestions.html",
  "contact.html",
  "assets/css/styles.css",
  "assets/js/site.js",
  "assets/img/wop-map.jpg",
  "assets/img/icon-192.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(CORE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then(function (r) {
      if (r.ok && e.request.url.indexOf(self.location.origin) === 0) {
        var copy = r.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      }
      return r;
    }).catch(function () {
      return caches.match(e.request, { ignoreSearch: true });
    })
  );
});
