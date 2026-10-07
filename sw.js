/* sw.js — offline cache for Mihwar */
var VER = 'mihwar-v4';
var PRECACHE = [
  "./",
  "editors.html",
  "extensions.html",
  "index.html",
  "learn.html",
  "specs.html",
  "assets/css/base.css",
  "assets/css/components.css",
  "assets/css/editors.css",
  "assets/css/extensions.css",
  "assets/css/home.css",
  "assets/css/learn.css",
  "assets/img/apple-touch-icon.png",
  "assets/img/favicon.svg",
  "assets/img/icon-192.png",
  "assets/img/icon-512.png",
  "assets/img/icon-maskable-512.png",
  "assets/js/copy.js",
  "assets/js/core.js",
  "assets/js/editors.js",
  "assets/js/extensions.js",
  "assets/js/home.js",
  "assets/js/platform-icons.js",
  "assets/js/spy.js"
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VER).then(function (c) { return c.addAll(PRECACHE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VER; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.protocol.indexOf('http') !== 0) return;

  /* pages: network first, fall back to cache when offline */
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(VER).then(function (c) { c.put(req, copy); });
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (r) { return r || caches.match('index.html'); });
    }));
    return;
  }

  /* same-origin files and Google Fonts: serve from cache, refresh in the background */
  var fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin === location.origin || fonts) {
    e.respondWith(caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) {
          var copy = res.clone();
          caches.open(VER).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    }));
  }
});
