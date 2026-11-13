/* Asistente Financiero — ayudante para abrir sin internet (generado por scripts/construir-web.js; versión 5352f6b617).
   Con internet pide siempre lo más nuevo (si subes cambios, se ven en la próxima apertura); sin internet o con internet lento usa la copia guardada.
   Nunca toca las llamadas a Google, Facebook, Drive ni a la IA: esas van directo a internet. */
const CACHE = 'asistente-5352f6b617';
const ARCHIVOS = ["./","app.css","app.js","apple-touch-icon.png","favicon.png","icon-192.png","icon-512.png","icon-maskable-512.png","index.html","logos.js","manifest.webmanifest","plan.js","tema.js"];
const ESPERA = 4000;

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(ARCHIVOS.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('asistente-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
function deInternet(req) {
  return new Promise((ok, mal) => {
    let listo = false; const t = setTimeout(() => { if (!listo) { listo = true; mal(new Error('tardó')); } }, ESPERA);
    // «no-cache»: siempre pregunta a GitHub si el archivo cambió (si no cambió responde sin bajarlo). Así no se queda con la copia de 10 minutos.
    fetch(req.mode === 'navigate' ? req.url : req, { cache: 'no-cache' }).then((r) => {
      if (listo) return; listo = true; clearTimeout(t);
      if (r && r.ok && r.type === 'basic') { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {}); }
      ok(r);
    }).catch((x) => { if (listo) return; listo = true; clearTimeout(t); mal(x); });
  });
}
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url; try { url = new URL(req.url); } catch (x) { return; }
  if (url.origin !== self.location.origin) return;
  if (url.searchParams.has('_v')) return;                       // consulta de «¿hay versión nueva?»: va directo a internet
  const guardado = () => caches.match(req, { ignoreSearch: true }).then((c) => c || (req.mode === 'navigate' ? caches.match('./index.html') : null) || new Response('', { status: 504, statusText: 'sin internet' }));
  e.respondWith(deInternet(req).then((r) => (r && r.ok ? r : guardado())).catch(guardado));
});
