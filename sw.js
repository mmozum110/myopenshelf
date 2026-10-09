/* OpenShelf service worker.
   Network first: visitors get the newest version whenever they're online, and the last saved copy
   when they're offline or on a weak connection. The page and the question bank (questions.js) are always
   checked with the server (cache: "no-cache"), so an update shows up on the next visit.
   When you upload a new index.html and questions.js, change VERSION below so old saved copies are cleared. */
const VERSION = "openshelf-v43";
const FILES = ["./", "index.html", "questions.js", "manifest.webmanifest", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png"];

self.addEventListener("install", e => {
  /* cache: "reload" skips the browser's short-term cache, so the saved copy is the newest one */
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache:"reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if(req.method !== "GET" || url.origin !== location.origin) return;
  const fresh = req.mode === "navigate" || /\/(index\.html)?$/.test(url.pathname) || /\/(questions|sw)\.js$/.test(url.pathname);
  const net = fresh ? fetch(req.url, { cache:"no-cache", credentials:"same-origin" }) : fetch(req);
  e.respondWith(
    net.then(res => {
      if(res.ok){ const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match(req, { ignoreSearch:true })).then(hit => hit || caches.match("index.html")))
  );
});
