/**
 * Service Worker — WB ANM GNM 2026 Prep PWA
 * Strategy:
 *   - Cache First  → CSS, JS, fonts, icons, SVG
 *   - Network First → HTML pages
 *   - Cache on demand → JSON data
 */

'use strict';

/* ── Cache Configuration ── */
const APP_VERSION   = 'v1.0.0';
const STATIC_CACHE  = `static-cache-${APP_VERSION}`;
const DYNAMIC_CACHE = `dynamic-cache-${APP_VERSION}`;
const DATA_CACHE    = `data-cache-${APP_VERSION}`;

/** Files to precache during install (App Shell) */
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/assets/css/variables.css',
  '/assets/css/reset.css',
  '/assets/css/base.css',
  '/assets/css/typography.css',
  '/assets/css/utilities.css',
  '/assets/css/print.css',
  '/assets/svg/icons.svg',
  '/pages/syllabus.html'
];

/** File extensions that use Cache First strategy */
const CACHE_FIRST_EXTENSIONS = [
  '.css', '.js', '.woff', '.woff2',
  '.ttf', '.otf', '.png', '.jpg',
  '.jpeg', '.svg', '.ico', '.webp'
];

/** Maximum entries in dynamic cache */
const DYNAMIC_CACHE_LIMIT = 50;

/* ════════════════════════════════════════
   INSTALL EVENT — Precache App Shell
════════════════════════════════════════ */
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing ${APP_VERSION}`);

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Precaching app shell...');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Precache complete');
        // Activate immediately without waiting for old SW to finish
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] Precache failed:', err);
      })
  );
});

/* ════════════════════════════════════════
   ACTIVATE EVENT — Clean Old Caches
════════════════════════════════════════ */
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating ${APP_VERSION}`);

  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, DATA_CACHE];

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => !currentCaches.includes(name))
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activated, claiming clients...');
        // Take control of all open pages immediately
        return self.clients.claim();
      })
  );
});

/* ════════════════════════════════════════
   FETCH EVENT — Serve Requests
════════════════════════════════════════ */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin & http(s) requests
  if (
    !request.url.startsWith('http') ||
    url.origin !== self.location.origin &&
    !url.hostname.includes('fonts.googleapis.com') &&
    !url.hostname.includes('fonts.gstatic.com')
  ) {
    return;
  }

  // Route to appropriate strategy
  if (isJsonData(url)) {
    event.respondWith(cacheOnDemand(request));
  } else if (isCacheFirst(url)) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(networkFirst(request));
  }
});

/* ════════════════════════════════════════
   STRATEGY HELPERS
════════════════════════════════════════ */

/**
 * Cache First Strategy
 * → Serve from cache; fall back to network & update cache
 * Used for: CSS, JS, fonts, images, icons
 */
async function cacheFirst(request) {
  try {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    console.warn('[SW] Cache first failed:', request.url, err);
    // Return cached offline fallback if available
    return caches.match('/offline.html');
  }
}

/**
 * Network First Strategy
 * → Try network; fall back to cache; ultimate fallback: offline.html
 * Used for: HTML pages
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Update dynamic cache with fresh response
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(request, networkResponse.clone());
      await limitCacheSize(DYNAMIC_CACHE, DYNAMIC_CACHE_LIMIT);
    }

    return networkResponse;
  } catch (err) {
    console.warn('[SW] Network failed, checking cache:', request.url);

    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Ultimate fallback for navigation requests
    if (request.mode === 'navigate') {
      const offline = await caches.match('/offline.html');
      if (offline) return offline;
    }

    // Generic error response
    return new Response(
      '<html><body><h1>অফলাইন</h1><p>পেজটি লোড হয়নি।</p></body></html>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

/**
 * Cache on Demand Strategy (Stale While Revalidate)
 * → Serve cache immediately & update in background
 * Used for: JSON data files
 */
async function cacheOnDemand(request) {
  const cache  = await caches.open(DATA_CACHE);
  const cached = await cache.match(request);

  // Fetch in background regardless
  const fetchPromise = fetch(request)
    .then(networkResponse => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(err => {
      console.warn('[SW] Data fetch failed:', err);
      return null;
    });

  // Return cached version immediately if available
  return cached || fetchPromise;
}

/* ════════════════════════════════════════
   UTILITY FUNCTIONS
════════════════════════════════════════ */

/**
 * Check if URL should use Cache First strategy
 * @param {URL} url
 * @returns {boolean}
 */
function isCacheFirst(url) {
  const pathname = url.pathname;
  return (
    CACHE_FIRST_EXTENSIONS.some(ext => pathname.endsWith(ext)) ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  );
}

/**
 * Check if URL is a JSON data file
 * @param {URL} url
 * @returns {boolean}
 */
function isJsonData(url) {
  return (
    url.pathname.endsWith('.json') &&
    !url.pathname.includes('manifest.json')
  );
}

/**
 * Limit cache to a maximum number of entries
 * Removes oldest entries first (FIFO)
 * @param {string} cacheName
 * @param {number} maxSize
 */
async function limitCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys  = await cache.keys();

  if (keys.length > maxSize) {
    const excess = keys.slice(0, keys.length - maxSize);
    await Promise.all(excess.map(key => cache.delete(key)));
  }
}

/* ════════════════════════════════════════
   MESSAGE HANDLER (from main thread)
════════════════════════════════════════ */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: APP_VERSION });
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(names => {
      Promise.all(names.map(n => caches.delete(n)));
    });
  }
});