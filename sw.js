/* ELTECH Personality - Service Worker
 * Estratégia network-first (igual ao ELTECH): quando há internet, sempre busca
 * a versão mais nova dos arquivos do app; sem internet, usa o cache (offline).
 * Bibliotecas externas (SheetJS, fontes) usam cache-first.
 *
 * AO PUBLICAR UMA NOVA VERSÃO: incremente CACHE_VERSION (igual em version.json
 * e em js/app.js -> APP_VERSION). Isso troca o cache e dispara o aviso
 * "Nova versão disponível" para quem já está com o app aberto.
 */
const CACHE_VERSION = "1.9.0";
const CACHE_NAME = `eltech-personality-v${CACHE_VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/db.js",
  "./js/auth.js",
  "./js/excel.js",
  "./js/app.js",
  "./manifest.json",
  "./version.json",
  "./assets/icon.svg",
  "./assets/icon-maskable.svg",
  "./assets/bg-dark.svg",
  "./assets/bg-light.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  // NÃO chamamos skipWaiting() aqui: o novo SW fica em espera até o usuário
  // tocar em "Atualizar" (ver o handler de mensagem abaixo).
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("eltech-personality-") && k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// O app envia esta mensagem quando o usuário confirma a atualização.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Mesma origem (arquivos do app): network-first com fallback para cache.
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          if (resp && resp.status === 200 && resp.type === "basic") {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          }
          return resp;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            if (cached) return cached;
            if (request.mode === "navigate") return caches.match("./index.html");
          })
        )
    );
    return;
  }

  // Recursos externos (SheetJS, Google Fonts): cache-first.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((resp) => {
          if (resp && resp.status === 200) {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          }
          return resp;
        })
        .catch(() => cached);
    })
  );
});
