// Service Worker for RostraCore PWA - HTTPS FIX v3
const CACHE_VERSION = 'v2.0.0-https-fix';
const CACHE_NAME = `rostracore-${CACHE_VERSION}`;

const STATIC_ASSETS = ['/', '/dashboard', '/employees', '/roster', '/sites', '/manifest.json'];

// Install - clear ALL old caches
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v2.0.0-https-fix');
  event.waitUntil(
    caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))))
      .then(() => caches.open(CACHE_NAME))
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate - claim clients
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v2.0.0-https-fix');
  event.waitUntil(
    caches.keys().then(names => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Fetch - FORCE HTTPS for Railway
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;

  // Force HTTPS for Railway
  if (url.hostname.includes('railway.app')) {
    if (url.protocol === 'http:') {
      console.log('[SW] Forcing HTTPS:', url.href);
      url.protocol = 'https:';
      event.respondWith(fetch(new Request(url.href, {
        method: event.request.method,
        headers: event.request.headers,
        mode: 'cors'
      })));
      return;
    }
    event.respondWith(fetch(event.request));
    return;
  }

  // API - network only
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Static - cache first
  event.respondWith(
    caches.match(event.request).then(r => r || fetch(event.request).then(res => {
      if (res.status === 200) {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
      }
      return res;
    }))
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(caches.keys().then(names => Promise.all(names.map(n => caches.delete(n)))));
  }
});

console.log('[SW] v2.0.0-https-fix loaded');
