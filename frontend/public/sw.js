// Service Worker for RostraCore PWA - HTTPS FIX v4
// ALWAYS rebuild Railway URLs with HTTPS
const CACHE_VERSION = 'v3.0.0-https-fix';
const CACHE_NAME = `rostracore-${CACHE_VERSION}`;

const STATIC_ASSETS = ['/', '/dashboard', '/employees', '/roster', '/sites', '/manifest.json'];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing v3.0.0-https-fix');
  event.waitUntil(
    caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))))
      .then(() => caches.open(CACHE_NAME))
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v3.0.0-https-fix');
  event.waitUntil(
    caches.keys().then(names => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = event.request.url;
  
  // Skip non-GET requests - let browser handle them
  if (event.request.method !== 'GET') {
    return;
  }

  // ALWAYS force HTTPS for Railway - rebuild the URL completely
  if (requestUrl.includes('railway.app')) {
    // Replace http:// with https:// in the URL string directly
    const httpsUrl = requestUrl.replace(/^http:\/\//i, 'https://');
    console.log('[SW] Railway request:', requestUrl, '→', httpsUrl);
    
    event.respondWith(
      fetch(httpsUrl, {
        method: event.request.method,
        headers: event.request.headers,
        mode: 'cors',
        credentials: event.request.credentials
      }).catch(err => {
        console.error('[SW] Fetch failed:', err);
        return new Response(JSON.stringify({ error: 'Network error' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Local API - network only
  if (requestUrl.includes('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Static assets - cache first
  event.respondWith(
    caches.match(event.request).then(r => r || fetch(event.request).then(res => {
      if (res && res.status === 200) {
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

console.log('[SW] v3.0.0-https-fix loaded');
