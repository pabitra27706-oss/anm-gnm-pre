// ============================================================
// SERVICE WORKER - ANM GNM PRE EXAM
// Version: v2.0.0
// ============================================================

const CACHE_NAME = 'anm-gnm-v2';

// All files that make up the app shell - CORRECTED PATHS
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './js/app.js',
  './js/countdown.js',
  './js/storage.js',
  './js/utils.js',
  './js/config.js',
  './js/scorer.js',
  './assets/css/base.css',
  './assets/css/variables.css',
  './assets/css/reset.css',
  './assets/css/typography.css',
  './assets/css/utilities.css',
  './assets/css/print.css',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Cache subdirectory assets - CRITICAL PAGES
const SUBDIRECTORY_ASSETS = [
  // Mock Test
  './mock-test/index.html',
  './mock-test/result.html',
  './mock-test/test.html',
  './mock-test/css/mock-layout.css',
  './mock-test/css/test-interface.css',
  './mock-test/css/timer.css',
  './mock-test/css/analysis.css',
  './mock-test/js/mock-app.js',
  './mock-test/js/mock-engine.js',
  './mock-test/js/mock-loader.js',
  
  // Practice
  './practice/index.html',
  './practice/quiz.html',
  './practice/result.html',
  './practice/filter.html',
  './practice/filter-quiz.html',
  './practice/unit-filter.html',
  './practice/css/practice-layout.css',
  './practice/css/quiz-interface.css',
  './practice/css/result-card.css',
  './practice/js/practice-app.js',
  './practice/js/quiz-engine.js',
  './practice/js/filter-app.js',
  
  // PYQ
  './pyq/index.html',
  './pyq/viewer.html',
  './pyq/css/pyq-layout.css',
  './pyq/css/pyq-viewer.css',
  './pyq/js/pyq-app.js',
  './pyq/js/pyq-engine.js',
  
  // Subjects
  './subjects/index.html',
  './subjects/css/subjects.css',
  './subjects/css/chapter.css',
  './subjects/js/subjects-nav.js',
  './subjects/js/chapter-reader.js',
  
  // Results
  './results/index.html',
  './results/css/results.css',
  './results/js/results-app.js',
  
  // Pages
  './pages/about.html',
  './pages/syllabus.html',
  './pages/exam-pattern.html',
  './pages/preparation-strategy.html',
  './pages/contact.html',
  './pages/privacy.html',
  './pages/css/pages.css'
];

// Combine all assets
const ALL_ASSETS = [...ASSETS_TO_CACHE, ...SUBDIRECTORY_ASSETS];

// ─────────────────────────────────────────────────────────────
// INSTALL - Pre-cache all app shell files
// ─────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing version:', CACHE_NAME);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
    .then(cache => {
      console.log('[SW] Pre-caching app shell');
      // Cache each file individually to avoid one failure breaking everything
      return Promise.allSettled(
        ALL_ASSETS.map(asset => {
          return cache.add(asset).catch(err => {
            console.warn('[SW] Failed to cache:', asset, err);
          });
        })
      );
    })
    .then(() => {
      console.log('[SW] Pre-cache complete');
      return self.skipWaiting();
    })
  );
});

// ─────────────────────────────────────────────────────────────
// ACTIVATE - Clean up old caches
// ─────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating - cleaning old caches');
  
  event.waitUntil(
    caches.keys()
    .then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[SW] Now controlling all clients');
      return self.clients.claim();
    })
  );
});

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function isHtmlRequest(request) {
  const acceptHeader = request.headers.get('accept') || '';
  return request.mode === 'navigate' || acceptHeader.includes('text/html');
}

function isAssetRequest(request) {
  const url = request.url;
  const assetExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.woff', '.woff2', '.ttf', '.json'];
  return assetExtensions.some(ext => url.endsWith(ext));
}

function isApiRequest(request) {
  return request.url.includes('/data/') || request.url.includes('.json');
}

// ─────────────────────────────────────────────────────────────
// FETCH - Network-first with cache fallback
// ─────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip non-HTTP(S) requests
  if (!request.url.startsWith('http')) return;
  
  // ──────────────────────────────────────────────────────────
  // HTML PAGES - Network first, fallback to cache, then offline.html
  // ──────────────────────────────────────────────────────────
  if (isHtmlRequest(request)) {
    event.respondWith(
      fetch(request)
      .then(response => {
        // Cache successful response
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        console.log('[SW] Network failed, trying cache for:', request.url);
        return caches.match(request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline page
            return caches.match('./offline.html');
          });
      })
    );
    return;
  }
  
  // ──────────────────────────────────────────────────────────
  // STATIC ASSETS - Cache first with network update
  // ──────────────────────────────────────────────────────────
  if (isAssetRequest(request)) {
    event.respondWith(
      caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Update cache in background
          fetch(request).then(response => {
            if (response && response.status === 200) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, response);
              });
            }
          }).catch(() => {});
          return cachedResponse;
        }
        
        // Not in cache, fetch and cache
        return fetch(request)
          .then(response => {
            if (response && response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, responseClone);
              });
            }
            return response;
          });
      })
    );
    return;
  }
  
  // ──────────────────────────────────────────────────────────
  // API/DATA - Network first, no cache fallback
  // ──────────────────────────────────────────────────────────
  if (isApiRequest(request)) {
    event.respondWith(
      fetch(request)
      .catch(() => {
        return new Response(JSON.stringify({ error: 'You are offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }
  
  // ──────────────────────────────────────────────────────────
  // EVERYTHING ELSE - Network first, try cache on failure
  // ──────────────────────────────────────────────────────────
  event.respondWith(
    fetch(request)
    .catch(() => {
      return caches.match(request);
    })
  );
});

// ─────────────────────────────────────────────────────────────
// MESSAGE HANDLER - For force updates
// ─────────────────────────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});