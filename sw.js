/**
 * Service Worker — solo cachea el "shell" de la app (HTML/CSS/JS propios).
 * Los datos del formulario NUNCA se cachean aquí: eso lo maneja OfflineQueue
 * con IndexedDB, que es lo correcto para datos (el cache del SW es para
 * archivos estáticos, no para reportes con fotos).
 */
const CACHE_NAME = 'conecte-reportes-v1';
// Todo el CSS y JS de la app vive dentro de Reportes.html (un solo archivo),
// así que el shell a cachear es nada más este:
const ARCHIVOS_SHELL = ['./', './Reportes.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ARCHIVOS_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(nombres.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// Estrategia: cache-first para el shell, red directa para todo lo demás
// (las llamadas a Apps Script nunca deben servirse desde cache).
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const esPropio = url.origin === self.location.origin;

  if (!esPropio || event.request.method !== 'GET') return; // deja pasar llamadas al backend tal cual

  event.respondWith(
    caches.match(event.request).then((cacheado) => {
      return cacheado || fetch(event.request).then((resp) => {
        const copia = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
        return resp;
      }).catch(() => cacheado);
    })
  );
});
