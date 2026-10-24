// Cada cambio de la app: subir la versión (mi-mascota-vNN)
const CACHE = 'mi-mascota-v14';
const ARCHIVOS = ['./', 'index.html', 'manifest.json', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // El script de Google nunca se guarda en caché
  if (url.hostname.endsWith('google.com') || url.hostname.endsWith('googleusercontent.com')) return;
  // Fuentes de Google: caché con actualización en segundo plano
  if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com')) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      const red = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || red;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // La app (index.html) siempre desde la red si hay conexión, para ver los cambios al momento; sin conexión, la copia guardada
  const esApp = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html');
  if (esApp) {
    e.respondWith(fetch(req, { cache: 'no-store' })
      .then(r => { if (r.ok) caches.open(CACHE).then(c => c.put('index.html', r.clone())); return r; })
      .catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).catch(() => caches.match('index.html'))));
});
