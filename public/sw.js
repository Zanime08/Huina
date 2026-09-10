/* HYPE FACTORY service worker — offline support (Yandex requirement). */
const CACHE = 'hype-factory-v2';
const CORE = ['./', './index.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()).catch(() => undefined),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // never touch Yandex SDK / platform traffic
  if (url.hostname.includes('yandex')) return;
  if (e.request.method !== 'GET') return;
  // network-first: players always get the fresh build after an update;
  // the cache only serves as an offline fallback.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => undefined);
        return res;
      })
      .catch(() =>
        caches.match(e.request, { ignoreSearch: true })
          .then((hit) => hit ?? caches.match('./index.html')),
      ),
  );
});
