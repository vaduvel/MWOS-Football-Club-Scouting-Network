const SHELL_CACHE = 'mwos-shell-v3';
const STATIC_CACHE = 'mwos-static-v3';
const RUNTIME_CACHE = 'mwos-runtime-v3';

const APP_SHELL = [
  '/',
  '/index.html',
  '/login',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/branding/mwos-fc-300-2.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![SHELL_CACHE, STATIC_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || networkPromise;
}

async function networkFirst(request, cacheName, fallbackRequest) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    if (fallbackRequest) {
      const fallback = await caches.match(fallbackRequest);
      if (fallback) {
        return fallback;
      }
    }

    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request, RUNTIME_CACHE, '/index.html'));
    return;
  }

  if (!isSameOrigin) {
    return;
  }

  if (
    ['style', 'script', 'image', 'font', 'manifest'].includes(event.request.destination) ||
    url.pathname.startsWith('/branding/')
  ) {
    event.respondWith(staleWhileRevalidate(event.request, STATIC_CACHE));
    return;
  }

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/functions/')) {
    event.respondWith(networkFirst(event.request, RUNTIME_CACHE));
  }
});
