/* ELTECH Personality - Service Worker
 * Estratégia:
 *  - App shell (HTML/CSS/JS/ícones): cache-first, atualizado em background.
 *  - CDN (SheetJS): stale-while-revalidate, para o import de Excel funcionar offline.
 *  Para publicar uma nova versão do app, incremente CACHE_VERSION.
 */
const CACHE_VERSION = "v1.0.0";
const CACHE_NAME = `eltech-personality-${CACHE_VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/db.js",
  "./js/auth.js",
  "./js/excel.js",
  "./js/app.js",
  "./manifest.json",
  "./assets/icon.svg",
  "./assets/icon-maskable.svg"
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
          .filter((k) => k.startsWith("eltech-personality-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Bibliotecas externas (SheetJS): stale-while-revalidate.
  if (url.origin !== self.location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((resp) => {
            if (resp && resp.status === 200) cache.put(request, resp.clone());
            return resp;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // App shell / navegação: cache-first com atualização em background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((resp) => {
          if (resp && resp.status === 200 && resp.type === "basic") {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          }
          return resp;
        })
        .catch(() => {
          // Se for uma navegação e estiver offline, devolve o app shell.
          if (request.mode === "navigate") return caches.match("./index.html");
        });
      return cached || network;
    })
  );
});
