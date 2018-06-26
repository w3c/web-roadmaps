const CACHE = 'cache-roadmap';

self.addEventListener('install', evt => {
  evt.waitUntil(caches.open(CACHE).then(cache => {
    console.log('Service worker installed');
    console.warn('TODO: add common entries to cache');
  }));
});

self.addEventListener('fetch', evt => {
  console.log('The service worker is serving the asset.');
  let cache = await caches.open(CACHE);

  // TODO: continue
  evt.respondWith(fromCache(evt.request));
  evt.waitUntil(update(evt.request));
});


async function fromCache(request) {
  let cache = await caches.open(CACHE);
  return cache.match(request);
}


async function update(request) {
  let cache = await caches.open(CACHE);
  let response = await fetch(request);
  return cache.put(request, response.clone());
}
