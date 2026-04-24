// ============================================================
// SERVICE WORKER
// App    : ANM GNM Pre Exam
// Repo   : https://github.com/pabitra27706-oss/anm-gnm-pre
// Hosted : https://pabitra27706-oss.github.io/anm-gnm-pre/
// Cache  : anm-gnm-v1
// ============================================================

const CACHE_NAME = 'anm-gnm-v1';

// All files that make up the app shell
// Paths are relative to the SW scope root (/anm-gnm-pre/)
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './js/app.js',
  './js/countdown.js',
  './assets/css/base.css',
  './icons/icon-192.png',
  './icons/icon-512.png'
];


// ─────────────────────────────────────────────────────────────
// INSTALL
// Pre-cache all app shell files when SW is first installed
// ─────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing — cache:', CACHE_NAME);
  
  event.waitUntil(
    caches
    .open(CACHE_NAME)
    .then(cache => {
      console.log('[SW] Pre-caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
    .then(() => {
      console.log('[SW] Pre-cache complete — activating immediately');
      // Force this SW to become active without waiting
      return self.skipWaiting();
    })
    .catch(err => {
      console.error('[SW] Pre-cache failed:', err);
    })
  );
});


// ─────────────────────────────────────────────────────────────
// ACTIVATE
// Clean up any old/stale caches from previous versions
// ─────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating — checking for old caches');
  
  event.waitUntil(
    caches
    .keys()
    .then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', name);
            return caches.delete(name);
          }
        })
      );
    })
    .then(() => {
      console.log('[SW] Active — claiming all open clients');
      // Take control of all open tabs immediately
      return self.clients.claim();
    })
    .catch(err => {
      console.error('[SW] Activation error:', err);
    })
  );
});


// ─────────────────────────────────────────────────────────────
// HELPER: Is this request for an HTML page / navigation?
// ─────────────────────────────────────────────────────────────
function isHtmlRequest(request) {
  const acceptHeader = request.headers.get('accept') || '';
  return (
    request.mode === 'navigate' ||
    acceptHeader.includes('text/html')
  );
}


// ─────────────────────────────────────────────────────────────
// HELPER: Is this request for a static asset?
// (JS, CSS, images, fonts, JSON, icons)
// ─────────────────────────────────────────────────────────────
function isAssetRequest(request) {
  const url = request.url;
  return (
    url.endsWith('.js') ||
    url.endsWith('.css') ||
    url.endsWith('.png') ||
    url.endsWith('.jpg') ||
    url.endsWith('.jpeg') ||
    url.endsWith('.gif') ||
    url.endsWith('.svg') ||
    url.endsWith('.ico') ||
    url.endsWith('.webp') ||
    url.endsWith('.woff') ||
    url.endsWith('.woff2') ||
    url.endsWith('.ttf') ||
    url.endsWith('.json')
  );
}


// ─────────────────────────────────────────────────────────────
// FETCH
// Strategy 1 — HTML pages  → Network First, fallback offline.html
// Strategy 2 — Assets      → Cache First, fallback network
// Strategy 3 — Everything  → Network First, fallback cache
// ─────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // ── Skip non-GET requests completely ────────────────────────
  if (request.method !== 'GET') return;
  
  // ── Skip non-HTTP(S) requests (browser extensions etc.) ─────
  if (
    !request.url.startsWith('http://') &&
    !request.url.startsWith('https://')
  ) return;
  
  // ── Skip cross-origin requests (CDN, external APIs etc.) ────
  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) {
    // Just let cross-origin requests go through normally
    return;
  }
  
  
  // ────────────────────────────────────────────────────────────
  // STRATEGY 1: NETWORK FIRST — HTML pages & navigation
  // Try network → on fail serve cached → final fallback offline.html
  // ────────────────────────────────────────────────────────────
  if (isHtmlRequest(request)) {
    event.respondWith(
      fetch(request)
      .then(networkResponse => {
        // Network responded — update cache in background
        if (networkResponse && networkResponse.status === 200) {
          const clonedResponse = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, clonedResponse);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        console.warn('[SW] Network failed for HTML — checking cache:', request.url);
        
        return caches.match(request).then(cachedResponse => {
          if (cachedResponse) {
            console.log('[SW] Serving cached HTML:', request.url);
            return cachedResponse;
          }
          
          // Nothing in cache — serve offline fallback
          console.warn('[SW] No cache for HTML — serving offline.html');
          return caches.match('./offline.html');
        });
      })
    );
    return;
  }
  
  
  // ────────────────────────────────────────────────────────────
  // STRATEGY 2: CACHE FIRST — static assets
  // Serve from cache instantly → if missing fetch & cache it
  // ────────────────────────────────────────────────────────────
  if (isAssetRequest(request)) {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          // Cache hit — serve immediately
          return cachedResponse;
        }
        
        // Cache miss — fetch from network and cache for next time
        console.log('[SW] Asset not cached — fetching:', request.url);
        return fetch(request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              const clonedResponse = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, clonedResponse);
              });
            }
            return networkResponse;
          })
          .catch(err => {
            console.warn('[SW] Asset fetch failed:', request.url, err);
            // Return nothing — browser will show its own error
          });
      })
    );
    return;
  }
  
  
  // ────────────────────────────────────────────────────────────
  // STRATEGY 3: NETWORK FIRST — everything else
  // ────────────────────────────────────────────────────────────
  event.respondWith(
    fetch(request)
    .then(networkResponse => networkResponse)
    .catch(() => {
      console.warn('[SW] Network failed — checking cache:', request.url);
      return caches.match(request);
    })
  );
});


// ─────────────────────────────────────────────────────────────
// MESSAGE — allow pages to communicate with SW
// Send { action: 'skipWaiting' } to force update
// ─────────────────────────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'skipWaiting') {
    console.log('[SW] Received skipWaiting message — updating now');
    self.skipWaiting();
  }
});