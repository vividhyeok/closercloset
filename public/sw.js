const CACHE = 'closer-shell-v7';
const CORE = ['/', '/icon.svg', '/icon-192.png', '/icon-512.png', '/manifest.webmanifest', '/art/front-base-v6.png', '/art/front-male-upper-v6.png','/art/front-female-upper-v6.png','/art/front-faces-v6.png','/art/front-lower-v6.png','/art/front-hoods-v6.png','/art/coat-lower-v7.png','/art/doodle-extras-v3.png'];
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
