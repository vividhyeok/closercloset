const CACHE = 'closer-shell-v4';
const CORE = ['/', '/icon.svg', '/icon-192.png', '/icon-512.png', '/manifest.webmanifest', '/art/doodle-base-v3.png', '/art/doodle-base-v4.png', '/art/doodle-male-parts-v3.png','/art/doodle-female-parts-v3.png','/art/doodle-extras-v3.png','/art/doodle-female-upper-v4.png','/art/doodle-female-coat-v4.png','/art/doodle-pose-shoes-v4.png'];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    const html = await (await cache.match('/')).text();
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(match => match[1]);
    await cache.addAll(assets);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('closer-shell-') && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (event.request.mode !== 'navigate' && new URL(event.request.url).pathname.startsWith('/assets/')) {
      const saved = await cache.match(event.request);
      if (saved) return saved;
    }
    try {
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    } catch {
      return await cache.match(event.request) || (event.request.mode === 'navigate' ? await cache.match('/') : Response.error());
    }
  })());
});
