// Woods of Parkview — service worker.
// Network-first so updates always show when online; cache fallback offline.
// Bump the cache name when shipping big changes.
var CACHE = "wopha-v3";

var CORE = [
  "/",
  "/membership/",
  "/amenities/",
  "/amenities/pool/",
  "/amenities/tennis/",
  "/amenities/swim-team/",
  "/community/",
  "/about/",
  "/about/board/",
  "/about/documents/",
  "/about/contact/",
  // "/thanks.html" is deliberately NOT precached: on Cloudflare Pages (and
  // wrangler pages dev) literal .html URLs 301/308-redirect to their clean
  // equivalent (here, "/thanks"). A precached response that followed that
  // redirect carries redirected=true, and navigation requests are always
  // made with redirect: "manual"; the platform refuses to fulfill a
  // manual-redirect request with a redirected response, so an offline visit
  // to /thanks.html would hard-fail instead of falling back to cache. The
  // runtime fetch handler below still opportunistically caches "/thanks"
  // (no redirect) the first time a visitor lands there online.
  "/assets/css/styles.css",
  "/assets/js/site.js",
  "/assets/img/wop-map.jpg",
  "/assets/img/icon-192.png",
  "/assets/fonts/fraunces-latin-500-normal.woff2",
  "/assets/fonts/fraunces-latin-600-normal.woff2",
  "/assets/fonts/public-sans-latin-400-normal.woff2",
  "/assets/fonts/public-sans-latin-600-normal.woff2",
  "/assets/fonts/public-sans-latin-700-normal.woff2"
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
  // API responses must always be live (or fail cleanly); portal pages are
  // login-gated and must never land in a shared cache.
  var path = new URL(e.request.url).pathname;
  if (path.indexOf("/api/") === 0 || path.indexOf("/portal/") === 0) return;
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
