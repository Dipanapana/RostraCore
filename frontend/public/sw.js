// Service Worker for RostraCore PWA - v4.0.0 (Vercel Rewrites)
// All API calls now go through Vercel rewrites - no Railway interception needed
const CACHE_VERSION = 'v4.0.0-vercel-rewrites';
const CACHE_NAME = `rostracore-${CACHE_VERSION}`;

// Only cache truly static assets
const STATIC_ASSETS = ['/manifest.json'];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing v4.0.0-vercel-rewrites - clearing ALL old caches');
  event.waitUntil(
    // Clear ALL caches first (nuke everything)
    caches.keys()
      .then(names => Promise.all(names.map(name => caches.delete(name))))
      .then(() => caches.open(CACHE_NAME))
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v4.0.0-vercel-rewrites');
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      ))
      .then(() => self.clients.claim())
      .then(() => {
        // Force reload all open tabs to get fresh JS
        self.clients.matchAll().then(clients => {
          clients.forEach(client => client.navigate(client.url));
        });
      })
  );
});

self.addEventListener('fetch', (event) => {
  // NEVER intercept API calls - let them go through Vercel rewrites normally
  // This includes both /api/* (Vercel proxy) and any Railway URLs (from old cached JS)
  if (event.request.url.includes('/api/') || event.request.url.includes('railway.app')) {
    return; // Don't intercept - use normal fetch
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // For static assets, use network-first strategy
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache only if network fails
        return caches.match(event.request);
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(names => Promise.all(names.map(name => caches.delete(name))))
    );
  }
});

console.log('[SW] v4.0.0-vercel-rewrites loaded - API calls bypass SW');
