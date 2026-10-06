const CACHE = "hongolandia-v104";
const ASSETS = [
  "./", "./index.html", "./style.css", "./manifest.json", "./vendor/break_eternity.min.js",
  "./js/main.js", "./js/decimal.js", "./js/format.js", "./js/data.js", "./js/state.js",
  "./js/engine.js", "./js/scene.js", "./js/ui.js", "./js/changelog.js", "./js/dungeon.js", "./js/dungeonVista.js", "./js/artefactos.js", "./js/eventos.js", "./js/invasion.js", "./js/puData.js", "./js/glvista.js", "./js/reinicio.js", "./js/prismas.js", "./js/altar.js",
  "./vendor/fonts/pixelify-sans.woff2", "./vendor/fonts/press-start-2p.woff2", "./vendor/fonts/vt323.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
